import { DEFAULT_BASE_URL, getBaseUrl, setBaseUrl } from "../config.js";

const input = document.getElementById("baseUrl");
const msg = document.getElementById("msg");

(async () => {
  input.value = await getBaseUrl();
})();

document.getElementById("save").addEventListener("click", async () => {
  const v = (input.value || "").trim();
  if (!/^https?:\/\//i.test(v)) {
    msg.textContent = "please enter a full URL (https://…)";
    msg.style.color = "#F28FAD";
    return;
  }
  await setBaseUrl(v.replace(/\/+$/, ""));
  msg.textContent = "saved.";
  msg.style.color = "#8BE3B4";
});

document.getElementById("reset").addEventListener("click", async () => {
  await setBaseUrl(DEFAULT_BASE_URL);
  input.value = DEFAULT_BASE_URL;
  msg.textContent = "reset to default.";
  msg.style.color = "#8BE3B4";
});
