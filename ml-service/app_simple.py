"""
Lightweight ML toxicity detector using scikit-learn
Pre-trained on toxic patterns - works immediately without downloading models
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
import numpy as np
import re
import logging

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pre-trained toxic patterns (no external model needed)
TOXIC_TRAINING_DATA = {
    'toxic': [
        'you are stupid', 'idiot', 'fuck you', 'piece of shit', 'kill yourself',
        'moron', 'dumb ass', 'retard', 'loser', 'pathetic', 'worthless',
        'shut up', 'go die', 'hate you', 'you suck', 'trash', 'garbage',
        'nobody likes you', 'everyone hates you', 'you are useless',
        'waste of space', 'brain dead', 'dumbass', 'asshole', 'bitch',
        'fuck off', 'piss off', 'damn you', 'screw you', 'bastard',
        'ugly', 'disgusting person', 'terrible human', 'worst ever',
        'stupid question', 'dumb idea', 'moronic thought', 'idiotic comment'
    ],
    'clean': [
        'thank you', 'great explanation', 'this helped me', 'well done',
        'i appreciate this', 'good job', 'nice work', 'helpful tutorial',
        'learned something new', 'very informative', 'clear and concise',
        'i disagree but respect your view', 'could you clarify', 'interesting point',
        'thanks for sharing', 'this is useful', 'good resource', 'well explained',
        'i have a question', 'can you help', 'please explain', 'not sure i understand',
        'makes sense', 'i see your point', 'fair enough', 'good thinking',
        'smart approach', 'creative solution', 'thoughtful response', 'valid concern',
        'i agree', 'exactly right', 'spot on', 'perfectly said'
    ]
}

# Initialize simple model
vectorizer = CountVectorizer(
    ngram_range=(1, 2),
    max_features=500,
    lowercase=True,
    token_pattern=r'\w{2,}'
)

classifier = MultinomialNB(alpha=1.0)

def train_simple_model():
    """Train a simple Naive Bayes model on toxic patterns"""
    global vectorizer, classifier
    
    # Prepare training data
    texts = TOXIC_TRAINING_DATA['toxic'] + TOXIC_TRAINING_DATA['clean']
    labels = [1] * len(TOXIC_TRAINING_DATA['toxic']) + [0] * len(TOXIC_TRAINING_DATA['clean'])
    
    # Train
    X = vectorizer.fit_transform(texts)
    classifier.fit(X, labels)
    
    logger.info(f"Simple model trained with {len(texts)} samples")

def preprocess_text(text):
    """Basic text preprocessing"""
    text = text.lower()
    text = re.sub(r'http\S+|www\S+', '', text)
    text = re.sub(r'[^\w\s]', ' ', text)
    text = ' '.join(text.split())
    return text

def predict_toxicity_simple(text, threshold=0.7):
    """Predict using simple model"""
    text_clean = preprocess_text(text)
    
    # Vectorize
    X = vectorizer.transform([text_clean])
    
    # Predict probability
    prob = classifier.predict_proba(X)[0]
    toxic_prob = prob[1] if len(prob) > 1 else 0
    
    # Detect categories based on keywords
    categories = []
    text_lower = text.lower()
    
    if any(word in text_lower for word in ['fuck', 'shit', 'damn', 'ass']):
        categories.append('profanity')
    if any(word in text_lower for word in ['idiot', 'stupid', 'moron', 'dumb']):
        categories.append('insult')
    if any(word in text_lower for word in ['kill', 'die', 'hurt']):
        categories.append('threat')
    
    is_toxic = toxic_prob >= threshold
    
    return {
        'isToxic': is_toxic,
        'score': float(toxic_prob),
        'categories': categories,
        'model': 'simple_nb',
        'suggestion': (
            "Your comment appears to be non-constructive. "
            "Please revise it to be more helpful and respectful."
        ) if is_toxic else None
    }

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model': 'simple_naive_bayes',
        'training_samples': len(TOXIC_TRAINING_DATA['toxic']) + len(TOXIC_TRAINING_DATA['clean'])
    })

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'Missing "text" field'}), 400
        
        text = data['text']
        threshold = data.get('threshold', 0.7)
        
        if not isinstance(text, str) or len(text.strip()) == 0:
            return jsonify({'error': 'Text must be a non-empty string'}), 400
        
        if len(text) > 5000:
            return jsonify({'error': 'Text too long'}), 400
        
        result = predict_toxicity_simple(text, threshold)
        
        logger.info(f"Prediction: {'TOXIC' if result['isToxic'] else 'CLEAN'} (score: {result['score']:.2f})")
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/batch-predict', methods=['POST'])
def batch_predict():
    try:
        data = request.get_json()
        
        if not data or 'texts' not in data:
            return jsonify({'error': 'Missing "texts" field'}), 400
        
        texts = data['texts']
        threshold = data.get('threshold', 0.7)
        
        if not isinstance(texts, list):
            return jsonify({'error': 'texts must be a list'}), 400
        
        predictions = [predict_toxicity_simple(text, threshold) for text in texts if isinstance(text, str)]
        
        return jsonify({'predictions': predictions})
    
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Train model on startup
    logger.info("Training simple toxicity model...")
    train_simple_model()
    logger.info("✅ Model ready!")
    
    # Run server
    import os
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
