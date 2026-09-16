async function test() {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer INVALID' },
    body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{role:'user', content:'hi'}] })
  });
  console.log(res.status);
  const data = await res.text();
  console.log(data);
}
test();
