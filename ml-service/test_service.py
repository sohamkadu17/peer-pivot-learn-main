"""
Test the toxicity detection ML service
"""

import requests
import json

# Configuration
BASE_URL = 'http://localhost:5000'

def test_health():
    """Test health check endpoint"""
    print("🔍 Testing health check...")
    response = requests.get(f'{BASE_URL}/health')
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_single_prediction():
    """Test single prediction"""
    print("🔍 Testing single prediction...")
    
    test_cases = [
        {"text": "This is a great tutorial, thanks for sharing!", "expected": "CLEAN"},
        {"text": "You're an idiot and this is stupid", "expected": "TOXIC"},
        {"text": "I disagree with your approach, but I appreciate the effort", "expected": "CLEAN"},
        {"text": "Fuck off you piece of shit", "expected": "TOXIC"},
        {"text": "Could you please explain this more clearly?", "expected": "CLEAN"},
    ]
    
    for i, test in enumerate(test_cases, 1):
        print(f"\nTest {i}: {test['text'][:50]}...")
        print(f"Expected: {test['expected']}")
        
        response = requests.post(
            f'{BASE_URL}/predict',
            json={'text': test['text'], 'threshold': 0.7}
        )
        
        if response.status_code == 200:
            result = response.json()
            actual = "TOXIC" if result['isToxic'] else "CLEAN"
            score = result['score']
            categories = result.get('categories', [])
            
            print(f"Actual: {actual} (score: {score:.3f})")
            if categories:
                print(f"Categories: {', '.join(categories)}")
            
            emoji = "✅" if actual == test['expected'] else "❌"
            print(f"{emoji} {'PASS' if actual == test['expected'] else 'FAIL'}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
    
    print()

def test_batch_prediction():
    """Test batch prediction"""
    print("🔍 Testing batch prediction...")
    
    texts = [
        "Great work!",
        "You suck",
        "Thanks for the help",
        "Go die",
        "I learned a lot from this"
    ]
    
    response = requests.post(
        f'{BASE_URL}/batch-predict',
        json={'texts': texts, 'threshold': 0.7}
    )
    
    if response.status_code == 200:
        results = response.json()['predictions']
        for text, result in zip(texts, results):
            status = "🔴 TOXIC" if result['isToxic'] else "🟢 CLEAN"
            print(f"{status} | {text} (score: {result['score']:.3f})")
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
    
    print()

def test_edge_cases():
    """Test edge cases"""
    print("🔍 Testing edge cases...")
    
    edge_cases = [
        {"text": "", "description": "Empty string"},
        {"text": "a" * 10000, "description": "Very long text"},
        {"text": "🤬😡💩", "description": "Only emojis"},
        {"text": "FUCK FUCK FUCK", "description": "Repeated profanity"},
    ]
    
    for case in edge_cases:
        print(f"\nTest: {case['description']}")
        response = requests.post(
            f'{BASE_URL}/predict',
            json={'text': case['text'][:100], 'threshold': 0.7}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Result: {'TOXIC' if result['isToxic'] else 'CLEAN'} (score: {result['score']:.3f})")
        else:
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text[:200]}")
    
    print()

if __name__ == '__main__':
    print("=" * 60)
    print("ML Toxicity Service Test Suite")
    print("=" * 60)
    print()
    
    try:
        test_health()
        test_single_prediction()
        test_batch_prediction()
        test_edge_cases()
        
        print("=" * 60)
        print("✅ All tests completed!")
        print("=" * 60)
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to service")
        print("Make sure the service is running on http://localhost:5000")
    except Exception as e:
        print(f"❌ Error: {e}")
