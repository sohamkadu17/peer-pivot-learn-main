# Algorithm Equations and Model Comparisons

**Current Model**: Logistic Regression with TF-IDF Vectorization  
**Date**: December 1, 2025  
**Task**: Text Toxicity Classification (Binary)

---

## 🧮 Mathematical Foundations

### 1. TF-IDF (Term Frequency-Inverse Document Frequency)

#### **TF (Term Frequency)**

$$
\text{TF}(t, d) = \frac{f_{t,d}}{\sum_{t' \in d} f_{t',d}}
$$

Where:
- $t$ = term (word)
- $d$ = document (comment)
- $f_{t,d}$ = frequency of term $t$ in document $d$
- Denominator = total number of terms in document $d$

#### **IDF (Inverse Document Frequency)**

$$
\text{IDF}(t, D) = \log \frac{N}{|\{d \in D : t \in d\}|}
$$

Where:
- $N$ = total number of documents in corpus
- $|\{d \in D : t \in d\}|$ = number of documents containing term $t$
- Logarithm reduces the weight of very common words

#### **TF-IDF Score**

$$
\text{TF-IDF}(t, d, D) = \text{TF}(t, d) \times \text{IDF}(t, D)
$$

#### **With Smoothing (Our Implementation)**

$$
\text{IDF}_{\text{smooth}}(t, D) = \log \frac{N + 1}{|\{d \in D : t \in d\}| + 1} + 1
$$

$$
\text{TF}_{\text{sublinear}}(t, d) = 1 + \log(\text{TF}(t, d))
$$

#### **L2 Normalization**

$$
\mathbf{v}_{\text{normalized}} = \frac{\mathbf{v}}{||\mathbf{v}||_2} = \frac{\mathbf{v}}{\sqrt{\sum_{i=1}^{n} v_i^2}}
$$

Where $\mathbf{v}$ is the TF-IDF vector for a document.

---

### 2. Logistic Regression

#### **Logistic Function (Sigmoid)**

$$
\sigma(z) = \frac{1}{1 + e^{-z}} = \frac{e^z}{1 + e^z}
$$

Where:
- $z$ = linear combination of features
- Output range: $(0, 1)$ representing probability

#### **Linear Combination**

$$
z = \mathbf{w}^T \mathbf{x} + b = \sum_{i=1}^{n} w_i x_i + b
$$

Where:
- $\mathbf{w}$ = weight vector (coefficients)
- $\mathbf{x}$ = feature vector (TF-IDF values)
- $b$ = bias term (intercept)
- $n$ = number of features (4,512 in our model)

#### **Prediction Probability**

$$
P(y=1|\mathbf{x}) = \sigma(\mathbf{w}^T \mathbf{x} + b) = \frac{1}{1 + e^{-(\mathbf{w}^T \mathbf{x} + b)}}
$$

$$
P(y=0|\mathbf{x}) = 1 - P(y=1|\mathbf{x})
$$

Where:
- $y=1$ = toxic comment
- $y=0$ = non-toxic comment

#### **Classification Rule**

$$
\hat{y} = \begin{cases} 
1 & \text{if } P(y=1|\mathbf{x}) \geq 0.5 \\
0 & \text{if } P(y=1|\mathbf{x}) < 0.5
\end{cases}
$$

#### **Cost Function (Binary Cross-Entropy Loss)**

$$
J(\mathbf{w}, b) = -\frac{1}{m} \sum_{i=1}^{m} \left[ y^{(i)} \log(\hat{y}^{(i)}) + (1 - y^{(i)}) \log(1 - \hat{y}^{(i)}) \right]
$$

Where:
- $m$ = number of training samples
- $y^{(i)}$ = true label for sample $i$
- $\hat{y}^{(i)} = P(y=1|\mathbf{x}^{(i)})$ = predicted probability

#### **Regularization (L2 - Ridge)**

$$
J_{\text{regularized}}(\mathbf{w}, b) = J(\mathbf{w}, b) + \frac{\lambda}{2m} \sum_{j=1}^{n} w_j^2
$$

Where:
- $\lambda = \frac{1}{C}$ in sklearn notation
- $C = 4.0$ in our model (inverse regularization strength)
- Higher $C$ = less regularization

#### **Optimization (SAGA Solver)**

SAGA (Stochastic Average Gradient Augmented) uses iterative updates:

$$
\mathbf{w}^{(t+1)} = \mathbf{w}^{(t)} - \eta \nabla J(\mathbf{w}^{(t)})
$$

Where:
- $\eta$ = learning rate (adaptive in SAGA)
- $\nabla J(\mathbf{w}^{(t)})$ = gradient of cost function

Gradient calculation:

$$
\frac{\partial J}{\partial w_j} = \frac{1}{m} \sum_{i=1}^{m} (\hat{y}^{(i)} - y^{(i)}) x_j^{(i)} + \frac{\lambda}{m} w_j
$$

$$
\frac{\partial J}{\partial b} = \frac{1}{m} \sum_{i=1}^{m} (\hat{y}^{(i)} - y^{(i)})
$$

---

### 3. Class Weight Balancing

For imbalanced datasets (46.2% toxic, 53.8% non-toxic):

$$
w_c = \frac{n_{\text{samples}}}{n_{\text{classes}} \times n_{\text{samples in class } c}}
$$

Where:
- $w_c$ = weight for class $c$
- $n_{\text{classes}} = 2$ (toxic, non-toxic)
- Minority class gets higher weight to compensate

In our model:
$$
w_{\text{toxic}} = \frac{1000}{2 \times 462} = 1.082
$$

$$
w_{\text{non-toxic}} = \frac{1000}{2 \times 538} = 0.929
$$

---

## 📊 Model Comparison Table

### Performance Comparison: Traditional ML vs Transformer Models

| Model | Accuracy | Precision | Recall | F1 Score | ROC-AUC | Parameters | Training Time | Inference Speed | Hardware Req |
|-------|----------|-----------|--------|----------|---------|------------|---------------|-----------------|--------------|
| **Our Model: Logistic Regression + TF-IDF** | **72.0%** | **72.0%** | **64.1%** | **67.8%** | **80.7%** | **~4.5K** | **3 sec** | **<1ms/sample** | **CPU** |
| Naive Bayes + TF-IDF | 68-73% | 66-70% | 62-68% | 64-69% | 75-80% | ~5K | <5 sec | <1ms | CPU |
| SVM (Linear) + TF-IDF | 70-75% | 71-76% | 65-70% | 68-73% | 78-83% | ~5K | 10-30 sec | 1-2ms | CPU |
| Random Forest + TF-IDF | 69-74% | 70-75% | 63-69% | 66-72% | 77-82% | 50K-500K | 30-60 sec | 5-10ms | CPU |
| XGBoost + TF-IDF | 72-77% | 73-78% | 67-72% | 70-75% | 81-86% | 50K-500K | 60-120 sec | 2-5ms | CPU |
| LSTM (BiLSTM) | 75-82% | 76-83% | 72-79% | 74-81% | 83-88% | 500K-2M | 5-15 min | 10-30ms | GPU |
| CNN (TextCNN) | 74-81% | 75-82% | 71-78% | 73-80% | 82-87% | 300K-1M | 3-10 min | 5-15ms | GPU |
| **BERT-base** | **85-92%** | **86-93%** | **83-90%** | **84-91%** | **90-95%** | **110M** | **30-60 min** | **50-100ms** | **GPU (8GB+)** |
| RoBERTa-base | 86-93% | 87-94% | 84-91% | 85-92% | 91-96% | 125M | 40-70 min | 60-120ms | GPU (8GB+) |
| DistilBERT | 82-89% | 83-90% | 80-87% | 81-88% | 88-93% | 66M | 15-30 min | 30-60ms | GPU (4GB+) |
| ALBERT-base | 84-91% | 85-92% | 82-89% | 83-90% | 89-94% | 12M | 20-40 min | 40-80ms | GPU (4GB+) |
| GPT-2 (fine-tuned) | 83-90% | 84-91% | 81-88% | 82-89% | 88-93% | 117M | 40-80 min | 80-150ms | GPU (8GB+) |
| XLNet-base | 86-93% | 87-94% | 84-91% | 85-92% | 91-96% | 110M | 50-90 min | 70-140ms | GPU (8GB+) |
| ELECTRA-small | 81-88% | 82-89% | 79-86% | 80-87% | 87-92% | 14M | 10-20 min | 20-40ms | GPU (4GB) |
| DeBERTa-base | 87-94% | 88-95% | 85-92% | 86-93% | 92-97% | 140M | 60-100 min | 80-160ms | GPU (16GB) |
| T5-small (seq2seq) | 82-89% | 83-90% | 80-87% | 81-88% | 88-93% | 60M | 30-60 min | 100-200ms | GPU (8GB) |
| Transformer-XL | 84-91% | 85-92% | 82-89% | 83-90% | 89-94% | 151M | 70-120 min | 90-180ms | GPU (16GB) |

---

## 🔬 Detailed Model Analysis

### **Category 1: Traditional Machine Learning (TF-IDF Based)**

#### 1. **Logistic Regression + TF-IDF** (Our Model)
- **Pros**: Fast, interpretable, works on CPU, low resource usage
- **Cons**: Limited context understanding, can't capture complex patterns
- **Best for**: Quick deployment, resource-constrained environments
- **Equation**: Linear model with sigmoid activation (see above)

#### 2. **Naive Bayes + TF-IDF**
- **Algorithm**: Probabilistic classifier based on Bayes' theorem
- **Equation**: 
$$P(y|\mathbf{x}) = \frac{P(\mathbf{x}|y) P(y)}{P(\mathbf{x})} \propto P(y) \prod_{i=1}^{n} P(x_i|y)$$
- **Pros**: Very fast, simple, works with small data
- **Cons**: Assumes feature independence (rarely true)

#### 3. **Support Vector Machine (SVM)**
- **Algorithm**: Finds optimal hyperplane separating classes
- **Equation**: 
$$\mathbf{w}^T \mathbf{x} + b = 0$$
Optimization: 
$$\min_{\mathbf{w}, b} \frac{1}{2}||\mathbf{w}||^2 + C \sum_{i=1}^{m} \max(0, 1 - y^{(i)}(\mathbf{w}^T \mathbf{x}^{(i)} + b))$$
- **Pros**: Effective in high dimensions, robust
- **Cons**: Slow on large datasets, sensitive to parameters

#### 4. **Random Forest**
- **Algorithm**: Ensemble of decision trees with majority voting
- **Equation**: 
$$\hat{y} = \text{mode}\{h_1(\mathbf{x}), h_2(\mathbf{x}), ..., h_T(\mathbf{x})\}$$
Where $h_t$ is the $t$-th decision tree
- **Pros**: Handles non-linearity, reduces overfitting
- **Cons**: Slower inference, less interpretable, larger memory

#### 5. **XGBoost (Gradient Boosting)**
- **Algorithm**: Sequential ensemble using gradient boosting
- **Equation**: 
$$\hat{y}^{(t)} = \hat{y}^{(t-1)} + \eta h_t(\mathbf{x})$$
Where $\eta$ is learning rate and $h_t$ is new tree
- **Pros**: State-of-art for tabular/TF-IDF, handles imbalance well
- **Cons**: Requires careful tuning, can overfit

---

### **Category 2: Deep Learning (Neural Networks)**

#### 6. **LSTM (Long Short-Term Memory)**
- **Architecture**: Recurrent neural network with memory cells
- **Equation**: 
$$f_t = \sigma(W_f \cdot [h_{t-1}, x_t] + b_f)$$ (Forget gate)
$$i_t = \sigma(W_i \cdot [h_{t-1}, x_t] + b_i)$$ (Input gate)
$$\tilde{C}_t = \tanh(W_C \cdot [h_{t-1}, x_t] + b_C)$$ (Candidate)
$$C_t = f_t \odot C_{t-1} + i_t \odot \tilde{C}_t$$ (Cell state)
$$o_t = \sigma(W_o \cdot [h_{t-1}, x_t] + b_o)$$ (Output gate)
$$h_t = o_t \odot \tanh(C_t)$$ (Hidden state)
- **Pros**: Captures sequential patterns, handles variable length
- **Cons**: Slow training, requires GPU, harder to interpret

#### 7. **CNN (Convolutional Neural Network)**
- **Architecture**: 1D convolutions over text sequences
- **Equation**: 
$$h_i = f(\mathbf{w} \cdot \mathbf{x}_{i:i+k-1} + b)$$
Where $k$ is filter width, $f$ is activation (ReLU)
- **Pros**: Fast parallel processing, captures local patterns
- **Cons**: Limited long-range dependencies, needs embeddings

---

### **Category 3: Transformer-Based Models**

#### 8. **BERT (Bidirectional Encoder Representations from Transformers)**
- **Architecture**: Transformer encoder with bidirectional attention
- **Key Innovation**: Masked Language Modeling (MLM) pre-training

**Self-Attention Mechanism**:
$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

Where:
- $Q$ = Query matrix ($\mathbf{x} W_Q$)
- $K$ = Key matrix ($\mathbf{x} W_K$)
- $V$ = Value matrix ($\mathbf{x} W_V$)
- $d_k$ = dimension of key vectors

**Multi-Head Attention**:
$$\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, ..., \text{head}_h)W^O$$
$$\text{head}_i = \text{Attention}(QW_i^Q, KW_i^K, VW_i^V)$$

**Transformer Block**:
$$\mathbf{z}_{\ell} = \text{LayerNorm}(\mathbf{x}_{\ell-1} + \text{MultiHead}(\mathbf{x}_{\ell-1}))$$
$$\mathbf{x}_{\ell} = \text{LayerNorm}(\mathbf{z}_{\ell} + \text{FFN}(\mathbf{z}_{\ell}))$$

**Feed-Forward Network (FFN)**:
$$\text{FFN}(\mathbf{x}) = \max(0, \mathbf{x}W_1 + b_1)W_2 + b_2$$

- **Pros**: State-of-art accuracy, captures context deeply, pre-trained
- **Cons**: Very slow, needs GPU, large memory, hard to deploy

#### 9. **RoBERTa (Robustly Optimized BERT)**
- **Improvements over BERT**: 
  - Dynamic masking
  - Larger batches
  - More training data
  - Removed Next Sentence Prediction (NSP)
- **Same architecture**: Transformer encoder
- **Better performance**: +1-2% accuracy over BERT

#### 10. **DistilBERT (Distilled BERT)**
- **Innovation**: Knowledge distillation from BERT
- **Equation**: 
$$L = \alpha L_{CE}(y, \hat{y}_{\text{student}}) + (1-\alpha) L_{KD}(P_{\text{teacher}}, P_{\text{student}})$$
Where $L_{KD}$ is KL-divergence between teacher and student predictions
- **Trade-off**: 40% smaller, 60% faster, ~3% accuracy drop

#### 11. **ALBERT (A Lite BERT)**
- **Innovations**:
  - **Factorized embeddings**: $O(V \times H) \rightarrow O(V \times E + E \times H)$
  - **Cross-layer parameter sharing**
  - **Sentence Order Prediction (SOP)** instead of NSP
- **Pros**: 18x fewer parameters than BERT, similar accuracy

#### 12. **ELECTRA (Efficiently Learning an Encoder)**
- **Innovation**: Replaced Token Detection (RTD) pre-training
- **Training**: Generator creates corrupted tokens, discriminator detects them
- **Equation**: 
$$L = \sum_{i=1}^{n} \mathbb{1}(x_i = \tilde{x}_i) \log P(x_i = \tilde{x}_i | \mathbf{x})$$
- **Advantage**: More efficient pre-training than BERT

#### 13. **DeBERTa (Decoding-enhanced BERT)**
- **Innovations**:
  - **Disentangled attention**: Separate content and position
  - **Enhanced mask decoder**
- **Equation**: 
$$A_{ij} = \{H_i, P_{i|j}\} \times \{H_j, P_{j|i}\}^T$$
Where $H$ = content, $P$ = position
- **Best performance**: Often beats BERT by 3-5%

#### 14. **XLNet**
- **Innovation**: Permutation language modeling (PLM)
- **Overcomes**: BERT's pre-train/fine-tune discrepancy
- **Equation**: 
$$\max_{\theta} \mathbb{E}_{z \sim Z} \left[ \sum_{t=1}^{T} \log P(x_{z_t} | \mathbf{x}_{z_{<t}}, \theta) \right]$$
Where $Z$ is permutations of sequence
- **Pros**: Better than BERT on many tasks

#### 15. **GPT-2 (Generative Pre-trained Transformer)**
- **Architecture**: Transformer decoder (unidirectional)
- **Training**: Next token prediction
- **Equation**: 
$$P(\mathbf{x}) = \prod_{i=1}^{n} P(x_i | x_1, ..., x_{i-1})$$
- **For classification**: Add classification head on top

#### 16. **T5 (Text-to-Text Transfer Transformer)**
- **Innovation**: All tasks as seq2seq
- **Input**: "classify toxicity: [text]"
- **Output**: "toxic" or "non-toxic"
- **Flexible**: Can handle multiple tasks with same model

---

## 📈 Performance vs Complexity Trade-off

### Visualization (Conceptual)

```
Accuracy (%)
    95 |                                    DeBERTa
       |                              BERT  RoBERTa  XLNet
    90 |                        ALBERT    
       |                    DistilBERT  GPT-2  T5
    85 |                LSTM  ELECTRA
       |            CNN   
    80 |        
       |    XGBoost   
    75 |  Random Forest  SVM
       |  Naive Bayes  [Our Model: LR+TF-IDF]
    70 |
       |_______________________________________________
         1sec  10sec  1min  10min  1hr    Complexity/Time →
```

---

## 🎯 When to Use Each Model

### **Use Logistic Regression + TF-IDF (Our Model) When:**
- ✅ Need fast inference (<1ms per prediction)
- ✅ Limited computational resources (CPU only)
- ✅ Interpretability is crucial (see feature weights)
- ✅ Dataset is small-medium (100-10K samples)
- ✅ Real-time applications (chatbots, live moderation)
- ✅ Quick prototyping and baseline
- ❌ Don't need state-of-art accuracy

### **Use XGBoost When:**
- ✅ Want best traditional ML performance
- ✅ Have structured/tabular features + TF-IDF
- ✅ Need better accuracy without GPU
- ✅ Can afford longer training time
- ❌ Need very fast inference

### **Use LSTM/CNN When:**
- ✅ Have GPU available
- ✅ Need sequence modeling
- ✅ Medium-sized dataset (10K-100K)
- ✅ Want embeddings (Word2Vec, GloVe)
- ❌ Can't afford transformer complexity

### **Use BERT/Transformers When:**
- ✅ Accuracy is top priority
- ✅ Have large GPU (8GB+ VRAM)
- ✅ Can afford slow inference (50-100ms)
- ✅ Have moderate training data (1K-1M samples)
- ✅ Fine-tuning from pre-trained model
- ❌ Need real-time performance

### **Use DistilBERT/ALBERT When:**
- ✅ Want transformer accuracy with less resources
- ✅ Need faster inference than BERT
- ✅ Limited GPU memory
- ✅ Mobile/edge deployment

---

## 🔄 Hybrid Approaches

### **Ensemble: Traditional ML + Transformers**
Combine multiple models:
$$P_{\text{ensemble}}(y=1|\mathbf{x}) = \alpha P_{\text{BERT}} + \beta P_{\text{LR}} + \gamma P_{\text{XGBoost}}$$

**Benefits**:
- Better accuracy than single model
- More robust predictions
- Can use voting or weighted averaging

### **Two-Stage Pipeline**
1. **Stage 1**: Fast model (LR) filters obvious cases
2. **Stage 2**: Slow model (BERT) handles uncertain cases

**Benefits**:
- 90% samples handled by fast model (<1ms)
- 10% uncertain samples use BERT (100ms)
- Average inference: ~10ms with near-BERT accuracy

---

## 📊 Resource Requirements Comparison

| Model | RAM | VRAM (GPU) | Storage | CPU Cores | Training Time (1K samples) |
|-------|-----|------------|---------|-----------|----------------------------|
| **Logistic Regression** | **<1GB** | **0GB** | **<10MB** | **1-4** | **3 sec** |
| XGBoost | 1-2GB | 0GB | 50-100MB | 4-8 | 60-120 sec |
| LSTM | 2-4GB | 2-4GB | 50-200MB | 4+ | 5-15 min |
| BERT-base | 4-8GB | 8-16GB | 400-500MB | 8+ | 30-60 min |
| RoBERTa-base | 4-8GB | 8-16GB | 500-600MB | 8+ | 40-70 min |
| DistilBERT | 2-4GB | 4-8GB | 250-300MB | 4+ | 15-30 min |

---

## 🏆 Summary Recommendations

### **For Production Deployment (Our Choice)**
- **Model**: Logistic Regression + TF-IDF
- **Why**: Fast, reliable, interpretable, works on CPU
- **Accuracy**: 72% (acceptable for real-time moderation)
- **Can upgrade to**: Ensemble with XGBoost (75-77% accuracy)

### **For Maximum Accuracy**
- **Model**: DeBERTa or RoBERTa
- **Why**: State-of-art performance (87-94%)
- **Requirement**: GPU infrastructure
- **Use case**: Batch processing, critical applications

### **For Balanced Performance**
- **Model**: DistilBERT or ELECTRA-small
- **Why**: Good accuracy (81-88%), moderate resources
- **Requirement**: GPU (4GB)
- **Use case**: API services with reasonable latency

### **For Edge/Mobile Deployment**
- **Model**: Our Logistic Regression (quantized)
- **Alternative**: MobileBERT, TinyBERT
- **Why**: Minimal resources, offline capable
- **Use case**: Mobile apps, IoT devices

---

## 📚 References

### **Our Implementation**
- Scikit-learn LogisticRegression (SAGA solver)
- TF-IDF with sublinear scaling and L2 normalization
- Dataset: YouTube Toxicity (1,000 samples)

### **Transformer Papers**
1. **BERT**: Devlin et al., 2018 - "BERT: Pre-training of Deep Bidirectional Transformers"
2. **RoBERTa**: Liu et al., 2019 - "RoBERTa: A Robustly Optimized BERT Pretraining Approach"
3. **DistilBERT**: Sanh et al., 2019 - "DistilBERT, a distilled version of BERT"
4. **ALBERT**: Lan et al., 2019 - "ALBERT: A Lite BERT for Self-supervised Learning"
5. **ELECTRA**: Clark et al., 2020 - "ELECTRA: Pre-training Text Encoders as Discriminators"
6. **DeBERTa**: He et al., 2020 - "DeBERTa: Decoding-enhanced BERT with Disentangled Attention"
7. **XLNet**: Yang et al., 2019 - "XLNet: Generalized Autoregressive Pretraining"

### **Performance Benchmarks**
- Based on common toxicity datasets: Jigsaw, Civil Comments, YouTube Toxicity
- Ranges reflect different dataset sizes and hyperparameter tuning

---

## ✅ Conclusion

**Our model (Logistic Regression + TF-IDF)** provides an excellent balance for:
- **Speed**: 1000x faster than BERT
- **Resources**: CPU-only, <1GB RAM
- **Interpretability**: Clear feature weights
- **Accuracy**: 72% (acceptable for baseline)

**For higher accuracy (85-94%)**, upgrade to BERT-family models with:
- **Cost**: 10-100x more compute time
- **Benefit**: 13-22% accuracy improvement
- **Trade-off**: Worth it for critical applications

The choice depends on your specific requirements for speed, accuracy, and available resources.
