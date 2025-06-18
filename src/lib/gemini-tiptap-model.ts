// gemini-tiptap-model.ts
// To run this code you need to install the following dependencies:
// npm install @google/genai mime
// npm install -D @types/node

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY!; // Pastikan ini sesuai dengan cara Anda mengambil API Key
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "application/json", // Kita akan minta JSON langsung dari model
};

// Create a safety settings configuration
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Create a function to handle model errors (bisa disatukan dengan yang sudah ada di gemini-ai-model.ts jika mau)
export const handleModelError = (error: any) => {
  console.error("Gemini API error:", error);

  if (error.response) {
    const { status } = error.response;

    if (status === 400) {
      return "The AI model could not process your request. Please try a different prompt.";
    } else if (status === 401) {
      return "Authentication error. Please check your API key.";
    } else if (status === 429) {
      return "Rate limit exceeded. Please try again later.";
    } else if (status === 500) {
      return "Server error. Please try again later.";
    }
  }

  if (error.message?.includes("Network Error")) {
    return "Network error. Please check your internet connection.";
  }

  if (error.message?.includes("safety") || error.message?.includes("blocked")) {
    return "Your prompt was flagged by safety filters. Please try a different prompt.";
  }

  return "An error occurred. Please try again.";
};

// Fungsi untuk memulai chat session dengan histori untuk TipTap
export const startTiptapChatSession = () => {
  return model.startChat({
    generationConfig,
    safetySettings,
    history: [
      {
        role: "user",
        parts: [
          {
            text: `Reference to a TipTap document structure (ProseMirror JSON format):
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": {
        "level": 2
      },
      "content": [
        {
          "type": "text",
          "text": "TipTap Example Document"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "This is an example of a document created with TipTap, built on ProseMirror."
        }
      ]
    },
    {
      "type": "heading",
      "attrs": {
        "level": 3
      },
      "content": [
        {
          "type": "text",
          "text": "Features"
        }
      ]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Built on ProseMirror"
                }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Framework agnostic"
                }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Supports various extensions"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "TipTap documents are represented as a nested JSON structure of nodes."
        }
      ]
    }
  ]
}`,
          },
        ],
      },
      {
        role: "model",
        parts: [
          {
            text: `\`\`\`json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": {
        "level": 1
      },
      "content": [
        {
          "type": "text",
          "text": "Grocery TODO List"
        }
      ]
    },
    {
      "type": "heading",
      "attrs": {
        "level": 2
      },
      "content": [
        {
          "type": "text",
          "text": "Produce"
        }
      ]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Apples"
                }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Bananas"
                }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Carrots"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "heading",
      "attrs": {
        "level": 2
      },
      "content": [
        {
          "type": "text",
          "text": "Dairy"
        }
      ]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Milk"
                }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Eggs"
                }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Cheese"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "heading",
      "attrs": {
        "level": 2
      },
      "content": [
        {
          "type": "text",
          "text": "Pantry"
        }
      ]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Pasta"
                }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Rice"
                }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Canned Tomatoes"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "Notes: Remember to check for coupons before going to the store!"
        }
      ]
    }
  ]
}
\`\`\``,
          },
        ],
      },
    ],
  });
};

// Create a wrapper function with error handling for TipTap
export const generateTiptapTemplate = async (prompt: string) => {
  try {
    const chatSession = startTiptapChatSession(); // Buat sesi baru setiap kali
    const result = await chatSession.sendMessage(prompt);
    const responseText = await result.response.text();

    // Hapus blok kode Markdown jika ada
    const cleanResponseText = responseText
      .replace(/```json\n|\n```/g, "")
      .trim();

    return JSON.parse(cleanResponseText);
  } catch (error) {
    throw new Error(handleModelError(error));
  }
};
