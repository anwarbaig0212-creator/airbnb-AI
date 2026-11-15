require("dotenv").config();

async function main() {
  console.log("Calling LLM...");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.new_api_key}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that writes short, warm Airbnb-style listing titles.",
        },
        {
          role: "user",
          content:
            "Write a title for a 2-bedroom apartment in Goa near the beach with a pool.",
        },
      ],
    }),
  });

  const data = await response.json();
  console.log("Status:", response.status);
  console.log("Full response keys:", Object.keys(data));
  console.log("---");
  console.log("Generated title:", data.choices?.[0]?.message?.content);
  console.log("Token usage:", data.usage);
}

main().catch((err) => {
  console.error("ERROR:", err);
});


