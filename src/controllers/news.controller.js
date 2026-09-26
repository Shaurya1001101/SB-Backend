const CURATED_NEWS = [
  {
    id: 1,
    title: 'NVIDIA Announces New TensorRT-LLM Inference Optimizations',
    summary: 'Throughput gains of up to 4x on Blackwell architectures, making sub-10ms token generation feasible for enterprise applications.',
    category: 'MLOps',
    source: 'NVIDIA Developer',
    date: 'Today',
    url: 'https://developer.nvidia.com',
  },
  {
    id: 2,
    title: 'Hugging Face Releases v5 of Transformers with Deep PEFT Integration',
    summary: 'Native quantized low-rank adaptation training with 60% less VRAM requirement on consumer-grade GPUs.',
    category: 'LLMs',
    source: 'Hugging Face',
    date: 'Yesterday',
    url: 'https://huggingface.co',
  },
  {
    id: 3,
    title: 'Apache Spark 4.0 Preview Introduces Native ANSI SQL & Enhanced Vector Engine',
    summary: 'Modern columnar shuffle formats and zero-copy Arrow memory management boost query speeds across lakehouse platforms.',
    category: 'Data Engineering',
    source: 'Apache Foundation',
    date: '2 days ago',
    url: 'https://spark.apache.org',
  },
  {
    id: 4,
    title: 'Tech Hiring Report: Demand for MLOps Engineers Up 38% Year-Over-Year',
    summary: 'Companies prioritize engineers capable of operationalizing, monitoring, and scaling AI models rather than raw research.',
    category: 'Job Market',
    source: 'SkillBridge Intelligence',
    date: '3 days ago',
    url: 'https://skillbridge.io',
  },
];

export async function getNews(req, res) {
  return res.status(200).json({
    articles: CURATED_NEWS,
    updatedAt: new Date().toISOString(),
  });
}
