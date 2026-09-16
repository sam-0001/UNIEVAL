async function test() {
  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.GEMINI_API_KEY;
  const res = await fetch(GEMINI_API_URL);
  console.log(res.status);
  console.log(await res.text());
}
test();
