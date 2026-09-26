const DOMAIN_KNOWLEDGE = {
  'mlops': 'MLOps Architecture: Export models to ONNX/TorchScript for low latency, containerize with multi-stage Docker (python:3.11-slim), serve via Triton Inference Server with dynamic batching, and deploy to Kubernetes with Horizontal Pod Autoscaling (HPA). Monitor for data/concept drift with Prometheus and Evidently AI.',
  'rag': 'Enterprise RAG Architecture: Use semantic chunking with 15-20% overlap, generate dense embeddings with BGE-large or text-embedding-3, index with HNSW in vector databases (pgvector/Chroma), perform hybrid lexical/dense search with Reciprocal Rank Fusion (RRF), and rerank candidates using Cross-Encoder models.',
  'pytorch': 'PyTorch autograd builds dynamic DAG computational graphs. Tensors with requires_grad=True accumulate gradients via loss.backward(). Use optimizer.zero_grad(set_to_none=True) to save memory, and torch.cuda.amp.autocast() for mixed-precision acceleration.',
  'spark': 'Apache Spark Optimization: Tune shuffle partitions, eliminate data skew by salting partition keys, and convert expensive Sort-Merge Joins into Broadcast Hash Joins for dimension tables under 10MB.',
  'system design': 'Production ML System Design: 2-stage retrieval funnel (Candidate Generation via Two-Tower Vector Search -> Heavy Ranker via Deep Neural Network DLRM -> Re-ranking and Diversity Filters). Low-latency features are served from Redis/Feast feature stores.',
  'a/b test': 'A/B Testing Rigor: Perform statistical power analysis (alpha=0.05, 1-beta=0.80) to size samples, control False Discovery Rate via the Benjamini-Hochberg procedure, and reduce metric variance using CUPED pre-experiment covariates.',
  'gap score': 'The gap score formula: Σ[skill_weight × max(0, required − current)] normalized to 0–100%. Higher weighted skills have a bigger impact on readiness.',
  'streak': 'Earn XP by solving daily problems (+10 XP) and checking off roadmap tasks (+25 XP). Maintain your streak by active check-ins daily.',
  'calendar': 'Export your roadmap as an .ics calendar file from the Improvement Map page to import into Google Calendar, Apple Calendar, or Outlook.',
};

function getRuleFallback(message) {
  const lower = message.toLowerCase();
  for (const [key, answer] of Object.entries(DOMAIN_KNOWLEDGE)) {
    if (lower.includes(key)) return answer;
  }
  return "I'm SkillBridge's AI Career Assistant. I can answer deep technical questions on MLOps, RAG, PyTorch autograd, Distributed Spark, System Design, or help adjust your career path.";
}

export async function chatAI(req, res) {
  const { message, context } = req.body || {};
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const apiKey = process.env.VITE_AI_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(200).json({
      reply: getRuleFallback(message),
      source: 'domain-knowledge-engine',
    });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are SkillBridge's technical career assistant. Context: ${JSON.stringify(context || {})}. Provide actionable, production-grade advice.`,
          },
          { role: 'user', content: message },
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return res.status(200).json({
        reply: data.choices?.[0]?.message?.content || getRuleFallback(message),
        source: 'openai-live',
      });
    }

    return res.status(200).json({
      reply: getRuleFallback(message),
      source: 'domain-knowledge-engine',
    });
  } catch (err) {
    console.error('Error in chatAI:', err);
    return res.status(200).json({
      reply: getRuleFallback(message),
      source: 'domain-knowledge-engine',
    });
  }
}
