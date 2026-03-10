const axios = require("axios");
require("./style.css");
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("getPass");
  btn.addEventListener("click", async () => {
    try {
      const res = await axios.post(
        "http://103.77.243.5:3000/api/generate-pass",
        {},
        {
          headers: {
            Authorization: `Bearer 5tAh5VOCW53jaMjk_qPD0RPGLQH58giYnMVoVRtcfcg`,
          },
        }
      );
      const { pass, key } = res.data;
      document.getElementById("result").innerHTML = `
        <div><strong>Key:</strong> ${key} <button onclick="navigator.clipboard.writeText('${key}')">Copy</button></div>
        <div><strong>Pass:</strong> ${pass} <button onclick="navigator.clipboard.writeText('${pass}')">Copy</button></div>
      `;
    } catch (err) {
      alert("Error: " + (err.response?.data?.error || "Failed"));
      console.log(err);
    }
  });
});
