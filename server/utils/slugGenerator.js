// Helper function to generate friendly default room names (e.g. swift-python-492)
function generateSlug() {
  const adjectives = ['swift', 'brave', 'bright', 'clever', 'calm', 'silent'];
  const nouns = ['python', 'code', 'coder', 'falcon', 'bear', 'pixel'];
  const numbers = Math.floor(100 + Math.random() * 900);
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adj}-${noun}-${numbers}`;
}

module.exports = { generateSlug };
