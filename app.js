const left_eye = document.getElementById("left_eye");
const right_eye = document.getElementById("right_eye");
const left_eyelid = document.getElementById("left_eyelid");
const right_eyelid = document.getElementById("right_eyelid");
const mouth = document.getElementById("mouth");
const upper_lip = document.getElementById("upper_lip");
const grin = document.getElementById("grin");
const sad = document.getElementById("sad");
const surprise = document.getElementById("surprise");
const smile = document.getElementById("smile");
const happy = document.getElementById("happy");
const wink = document.getElementById("wink");
const frown = document.getElementById("frown");
const neutral = document.getElementById("neutral");
let blinkInterval = null;
let winkInterval = null;




function wink() {
  // stop any previous blinking
    if (winkInterval)

  blinkInterval = setInterval(() => {
    left_eye.style.height = "50%";
    right_eye.style.height = "50%";
    left_eyelid.style.height = "90%";
    right_eyelid.style.height = "90%";

    setTimeout(() => {
      left_eye.style.height = "100%";
      right_eye.style.height = "100%";
      left_eyelid.style.height = "0%";
      right_eyelid.style.height = "0%";
    }, 200);
  }, 3000);
}


function stopBlink() {
  if (blinkInterval !== null) {
    clearInterval(blinkInterval);
    blinkInterval = null;
  }
}











sad.addEventListener("click", ()=>{
  alert("The button is working");
  blink();
  stopWink();
    mouth.style.borderTopRightRadius= "70%";
    mouth.style.borderTopLeftRadius= "70%";
    mouth.style.borderBottomLeftRadius= "5px";
    mouth.style.borderBottomRightRadius= "5px";
    mouth.style.width= "80%";
    left_eyelid.style.height = "0%";
    right_eyelid.style.height = "0%";
    left_eye.style.height = "70%";
    right_eye.style.height = "70%";
    upper_lip.style.height = "0%";
});
