const left_eye = document.getElementById("left_eye");
const right_eye = document.getElementById("right_eye");
const left_eyelid = document.getElementById("left_eyelid");
const right_eyelid = document.getElementById("right_eyelid");
const mouth = document.getElementById("mouth");
const grin = document.getElementById("grin");
const sad = document.getElementById("sad");
const surprise = document.getElementById("surprise");
const smile = document.getElementById("smile");





function blink() {
  setInterval(() => {

    left_eye.style.height = "5%";
    right_eye.style.height = "5%";

    setTimeout(() => {
      left_eye.style.height = "100%";
      right_eye.style.height = "100%"; 
    }, 200);

  }, 3000);
}

blink();


sad.addEventListener("click", ()=>{
    mouth.style.borderTopRightRadius= "50%";
    mouth.style.borderTopLeftRadius= "50%";
    mouth.style.borderBottomLeftRadius= "5px";
    mouth.style.borderBottomRightRadius= "5px";
    mouth.style.width= "80%";
    left_eyelid.style.height = "0%";
    right_eyelid.style.height = "0%";
    left_eye.style.height = "70%";
    right_eye.style.height = "70%";
})

grin.addEventListener("click", ()=>{
  mouth.style.borderTopRightRadius= "5px";
    mouth.style.borderTopLeftRadius= "5px";
    mouth.style.borderBottomLeftRadius= "50%";
    mouth.style.borderBottomRightRadius= "50%";
    mouth.style.width= "80%";
    left_eyelid.style.height = "0%";
    right_eyelid.style.height = "0%";
    left_eye.style.height = "90%";
    right_eye.style.height = "90%";
})

surprise.addEventListener("click", ()=>{
  mouth.style.borderRadius= "50%";
  mouth.style.width= "26vh";
  left_eyelid.style.height = "0%";
  right_eyelid.style.height = "0%";
  left_eye.style.height = "100%";
  right_eye.style.height = "100%";
})


smile.addEventListener("click", ()=>{
  mouth.style.borderTopRightRadius= "5px";
    mouth.style.borderTopLeftRadius= "5px";
    mouth.style.borderBottomLeftRadius= "50px";
    mouth.style.borderBottomRightRadius= "50px";
    mouth.style.width= "80%";
    left_eyelid.style.height = "85%";
    right_eyelid.style.height = "85%";
    left_eye.style.height = "80%";
    right_eye.style.height = "80%";
})

