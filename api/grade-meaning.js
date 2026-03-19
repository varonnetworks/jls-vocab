export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { items } = req.body;
  if (!items || items.length === 0) {
    return res.status(200).json({ results: [] });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  const prompt = `당신은 한국어 영어 단어 시험의 채점관입니다. 아래 기준을 정확히 따르세요.

[✅ 정답 처리 기준]
1. 뜻이 여러 개(쉼표로 구분)인 경우, 그 중 하나만 써도 정답
2. 핵심 의미가 맞으면 수식어 누락 허용 (예: "전국적인 유행병" → "유행병" ✅)
3. 같은 개념의 유사어 허용 (예: "번창하다" → "번영하다" ✅ / "회전하다" → "돌리다" ✅)
4. 형용사 ↔ 부사 혼동 허용 (예: "아름다운" → "아름답게" ✅)
5. 자동사 ↔ 타동사 혼동 허용 (예: "회복되다" → "회복하다" ✅)

[❌ 오답 처리 기준]
1. 품사가 다른 경우 (형용사↔부사, 자/타동사 제외)
   - 동사 ↔ 명사/형용사, 명사 ↔ 동사/형용사, 형용사 ↔ 동사/명사
2. 의미가 막연하게 비슷한 경우 (예: "격려하다" → "돕다" ❌)
3. 핵심 의미가 완전히 다른 경우

답안 목록:
${JSON.stringify(items.map((p) => ({
  originalId: p.originalId,
  word: p.word,
  correctAnswer: p.answer,
  userAnswer: p.userInput
})))}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이:
{"results":[{"originalId":0,"correct":true},{"originalId":1,"correct":false},...]}`;

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "qwen/qwen3-32b",
        reasoning_effort: "none",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await groqRes.json();
    const text = data.choices[0].message.content;
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(200).json({ results: [] });
  }
}
