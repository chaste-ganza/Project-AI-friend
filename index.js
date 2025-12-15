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





function blink() {
  setInterval(() => {

    left_eye.style.height = "5%";
    right_eye.style.height = "5%";

    setTimeout(() => {
      left_eye.style.height = "100%";
      right_eye.style.height = "100%"; 
    }, 200);

  }, 2000);
  
}


function mouthOpenSmall() {
  mouth.style.borderRadius= "50%";
  mouth.style.width= "20vh";
  mouth.style.height = "20vh";
  upper_lip.style.height = "0%";
}


function mouthOpenMedium() {
  mouth.style.borderRadius= "30%";
  mouth.style.width= "25vh";
  mouth.style.height = "25vh";
  upper_lip.style.height = "0%";
}


function mouthOpenWide() {
  mouth.style.borderRadius= "20%";
  mouth.style.width= "40vh";
  mouth.style.height = "20vh";
  upper_lip.style.height = "0%";
};





blink();

sad.addEventListener("click", ()=>{
    mouth.style.borderRadius = "50% 50% 5px 5px";
    mouth.style.width= "80%";
    left_eyelid.style.height = "0%";
    right_eyelid.style.height = "0%";
    left_eye.style.height = "70%";
    right_eye.style.height = "70%";
    upper_lip.style.height = "0%";
})

grin.addEventListener("click", ()=>{
    mouth.style.borderRadius = "5px 5px 50% 50%";
    mouth.style.width= "80%";
    left_eyelid.style.height = "0%";
    right_eyelid.style.height = "0%";
    left_eye.style.height = "90%";
    right_eye.style.height = "90%";
    upper_lip.style.height = "0%";
})

surprise.addEventListener("click", ()=>{
  mouth.style.borderRadius= "50%";
  mouth.style.width= "26vh";
  left_eyelid.style.height = "0%";
  right_eyelid.style.height = "0%";
  left_eye.style.height = "100%";
  right_eye.style.height = "100%";
  upper_lip.style.height = "0%";
})


smile.addEventListener("click", ()=>{
  mouth.style.borderRadius = "5px 5px 50% 50%";
    mouth.style.width= "80%";
    left_eyelid.style.height = "85%";
    right_eyelid.style.height = "85%";
    left_eye.style.height = "80%";
    right_eye.style.height = "80%";
    upper_lip.style.height = "0%";
})

happy.addEventListener("click", ()=>{
  mouth.style.borderRadius = "5px 5px 50% 50%";
    mouth.style.width= "80%";
    left_eyelid.style.height = "80%";
    right_eyelid.style.height = "80%";
    left_eye.style.height = "90%";
    right_eye.style.height = "90%";
    upper_lip.style.height = "80%";
})




