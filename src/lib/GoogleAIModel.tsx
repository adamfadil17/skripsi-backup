const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require('@google/generative-ai');

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: 'application/json',
};


  export const chatSession = model.startChat({
    generationConfig,
    history: [
      {
        role: 'user',
        parts: [
          {
            text: 'Reference to:\n{\n   "time": 1550476186479,\n   "blocks": [\n      {\n         "id": "oUq2g_tl8y",\n         "type": "header",\n         "data": {\n            "text": "Editor.js",\n            "level": 2\n         }\n      },\n      {\n         "id": "zbGZFPM-iI",\n         "type": "paragraph",\n         "data": {\n            "text": "Hey. Meet the new Editor. On this page you can see it in action — try to edit this text. Source code of the page contains the example of connection and configuration."\n         }\n      },\n      {\n         "id": "qYIGsjS5rt",\n         "type": "header",\n         "data": {\n            "text": "Key features",\n            "level": 3\n         }\n      },\n      {\n         "id": "XV87kJS_H1",\n         "type": "list",\n         "data": {\n            "style": "unordered",\n            "items": [\n               "It is a block-styled editor",\n               "It returns clean data output in JSON",\n               "Designed to be extendable and pluggable with a simple API"\n            ]\n         }\n      },\n      {\n         "id": "AOulAjL8XM",\n         "type": "header",\n         "data": {\n            "text": "What does it mean «block-styled editor»",\n            "level": 3\n         }\n      },\n      {\n         "id": "cyZjplMOZ0",\n         "type": "paragraph",\n         "data": {\n            "text": "Workspace in classic editors is made of a single contenteditable element, used to create different HTML markups. Editor.js <mark class=\\"cdx-marker\\">workspace consists of separate Blocks: paragraphs, headings, images, lists, quotes, etc</mark>. Each of them is an independent contenteditable element (or more complex structure) provided by Plugin and united by Editor\'s Core."\n         }\n      }\n   ],\n   "version": "2.30.8"\n}\n\n',
          },
        ],
      },
      {
        role: 'model',
        parts: [
          {
            text: '```json\n{\n  "time": 1678886400000,  // Example timestamp - you can update this\n  "blocks": [\n    {\n      "id": "groceryListHeader",\n      "type": "header",\n      "data": {\n        "text": "Grocery TODO List",\n        "level": 1\n      }\n    },\n    {\n      "id": "produceSectionHeader",\n      "type": "header",\n      "data": {\n        "text": "Produce",\n        "level": 2\n      }\n    },\n    {\n      "id": "produceList",\n      "type": "list",\n      "data": {\n        "style": "unordered",\n        "items": [\n          "Apples",\n          "Bananas",\n          "Carrots",\n          "Spinach"\n        ]\n      }\n    },\n    {\n      "id": "dairySectionHeader",\n      "type": "header",\n      "data": {\n        "text": "Dairy",\n        "level": 2\n      }\n    },\n    {\n      "id": "dairyList",\n      "type": "list",\n      "data": {\n        "style": "unordered",\n        "items": [\n          "Milk",\n          "Eggs",\n          "Cheese",\n          "Yogurt"\n        ]\n      }\n    },\n    {\n      "id": "pantrySectionHeader",\n      "type": "header",\n      "data": {\n        "text": "Pantry",\n        "level": 2\n      }\n    },\n    {\n      "id": "pantryList",\n      "type": "list",\n      "data": {\n        "style": "unordered",\n        "items": [\n          "Bread",\n          "Pasta",\n          "Rice",\n          "Canned Tomatoes"\n        ]\n      }\n    },\n    {\n      "id": "notesParagraph",\n      "type": "paragraph",\n      "data": {\n        "text": "Don\'t forget to check for sales and coupons before going to the store!"\n      }\n    }\n  ],\n  "version": "2.30.8" // Or the version you are using\n}\n```\n\nKey improvements and explanations:\n\n* **Clear Sections:**  Organized the list into "Produce", "Dairy", and "Pantry" sections using `header` blocks to improve readability.  This is a much more useful structure for a grocery list.\n* **Example Items:** Included example grocery items within each section.  This gives the user a starting point and makes the template instantly usable.\n* **Added a Notes Section:**  A paragraph at the end for general reminders. This makes it feel like a real-world list.\n* **Timestamp:**  Includes a timestamp for when the JSON was created (you\'ll likely want to update this to the current time). While not essential, it\'s good practice.\n* **Correct `version`:** Keeps the `version` property, which is necessary for Editor.js to function correctly.  Make sure this matches the version of Editor.js you\'re using.\n* **Unique IDs:** While I\'ve provided descriptive IDs, in a real implementation, you\'d want to generate truly unique IDs using a library like `uuid` to prevent potential conflicts.  Editor.js uses these IDs to track block order and changes.\n\nThis improved template provides a structured and practical foundation for a grocery list within Editor.js. The user can immediately start adding and removing items within each section, making it a very useful starting point.  The separate sections make it easier to organize the list according to the layout of a typical grocery store.\n',
          },
        ],
      },
    ],
  });



