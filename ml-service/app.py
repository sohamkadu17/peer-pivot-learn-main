"""
Custom ML-Based Toxicity Detection Service
Uses pre-trained transformer models from Hugging Face
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import torch
import logging
import os

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model variable
toxicity_classifier = None
model_name = os.getenv('MODEL_NAME', 'unitary/toxic-bert')

def load_model():
    """Load the toxicity detection model"""
    global toxicity_classifier
    
    try:
        logger.info(f"Loading model: {model_name}")
        
        # Load pre-trained toxicity detection model
        # Options:
        # - 'unitary/toxic-bert' (default, robust)
        # - 'martin-ha/toxic-comment-model'
        # - 'facebook/roberta-hate-speech-dynabench-r4-target'
        
        toxicity_classifier = pipeline(
            "text-classification",
            model=model_name,
            tokenizer=model_name,
            device=0 if torch.cuda.is_available() else -1,  # Use GPU if available
            top_k=None  # Return all labels with scores
        )
        
        logger.info("Model loaded successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}")
        return False

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model': model_name,
        'gpu_available': torch.cuda.is_available()
    })

@app.route('/predict', methods=['POST'])
def predict_toxicity():
    """
    Predict toxicity of input text
    
    Request body:
    {
        "text": "string to analyze",
        "threshold": 0.7 (optional, default 0.7)
    }
    
    Response:
    {
        "isToxic": bool,
        "score": float,
        "categories": [list of detected categories],
        "all_scores": {detailed scores for each category},
        "suggestion": string (if toxic)
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'Missing "text" field'}), 400
        
        text = data['text']
        threshold = data.get('threshold', 0.7)
        
        # Validate inputs
        if not isinstance(text, str) or len(text.strip()) == 0:
            return jsonify({'error': 'Text must be a non-empty string'}), 400
        
        if len(text) > 5000:
            return jsonify({'error': 'Text too long (max 5000 characters)'}), 400
        
        # Truncate if needed
        text = text[:512]  # Most models have 512 token limit
        
        # Get predictions
        results = toxicity_classifier(text)
        
        # Process results
        # Format depends on model, but typically returns list of dicts with 'label' and 'score'
        max_score = 0
        toxic_categories = []
        all_scores = {}
        
        if isinstance(results, list) and len(results) > 0:
            if isinstance(results[0], list):
                # Multiple labels returned
                for prediction in results[0]:
                    label = prediction['label']
                    score = prediction['score']
                    all_scores[label] = score
                    
                    if score > threshold and 'toxic' in label.lower():
                        toxic_categories.append(label)
                        max_score = max(max_score, score)
            else:
                # Single prediction
                label = results[0]['label']
                score = results[0]['score']
                all_scores[label] = score
                
                if 'toxic' in label.lower() and score > threshold:
                    toxic_categories.append(label)
                    max_score = score
        
        is_toxic = len(toxic_categories) > 0 or max_score > threshold
        
        response = {
            'isToxic': is_toxic,
            'score': max_score,
            'categories': toxic_categories,
            'all_scores': all_scores,
            'model': model_name,
            'suggestion': (
                "Your comment appears to be non-constructive. "
                "Please revise it to be more helpful and respectful."
            ) if is_toxic else None
        }
        
        logger.info(f"Prediction: {'TOXIC' if is_toxic else 'CLEAN'} (score: {max_score:.2f})")
        
        return jsonify(response)
    
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({
            'error': 'Prediction failed',
            'details': str(e)
        }), 500

@app.route('/batch-predict', methods=['POST'])
def batch_predict():
    """
    Batch prediction for multiple texts
    
    Request body:
    {
        "texts": ["text1", "text2", ...],
        "threshold": 0.7 (optional)
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'texts' not in data:
            return jsonify({'error': 'Missing "texts" field'}), 400
        
        texts = data['texts']
        threshold = data.get('threshold', 0.7)
        
        if not isinstance(texts, list) or len(texts) == 0:
            return jsonify({'error': 'texts must be a non-empty list'}), 400
        
        if len(texts) > 100:
            return jsonify({'error': 'Maximum 100 texts per batch'}), 400
        
        # Truncate texts
        texts = [t[:512] for t in texts if isinstance(t, str) and len(t.strip()) > 0]
        
        # Batch prediction
        results = toxicity_classifier(texts)
        
        predictions = []
        for result in results:
            max_score = 0
            toxic_categories = []
            
            if isinstance(result, list):
                for pred in result:
                    if 'toxic' in pred['label'].lower() and pred['score'] > threshold:
                        toxic_categories.append(pred['label'])
                        max_score = max(max_score, pred['score'])
            
            is_toxic = len(toxic_categories) > 0
            predictions.append({
                'isToxic': is_toxic,
                'score': max_score,
                'categories': toxic_categories
            })
        
        return jsonify({'predictions': predictions})
    
    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}")
        return jsonify({
            'error': 'Batch prediction failed',
            'details': str(e)
        }), 500

if __name__ == '__main__':
    # Load model on startup
    if not load_model():
        logger.error("Failed to load model, exiting...")
        exit(1)
    
    # Run server
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
