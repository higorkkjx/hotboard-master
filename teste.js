const axios = require("axios")

const sendMessageHook = async (number, msg, keybase) => {
  const url = `https://evolucaohot.online/message/text?key=${keybase}`;
  const headers = {
    "accept": "*/*",
    "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "content-type": "application/json",
    "sec-ch-ua": "\"Not/A)Brand\";v=\"8\", \"Chromium\";v=\"126\", \"Google Chrome\";v=\"126\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "Referer": `https://evolucaohot.online/chat?num=5517996607540@s.whatsapp.net&key=${keybase}`,
    "Referrer-Policy": "strict-origin-when-cross-origin"
  };

  const body = {
    id: number,
    typeId: "user",
    message: msg,
    options: {
      delay: 0,
      replyFrom: ""
    },
    groupOptions: {
      markUser: ""
    }
  };

  try {
    const response = await axios.post(url, body, { headers });

    if (response.status !== 200) {
      console.log(`Error: ${response.statusText}`);
    }

    const data = response.data;
    console.log(data);
    return data;
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

 sendMessageHook("5517991134416", "oi", "chefe5")