const left_eye = document.getElementById("left_eye");
const right_eye = document.getElementById("right_eye");
const mouth = document.getElementById("mouth");
const test = document.getElementById("test");

function mouth1 () {
    mouth.style.height = "15vh";
    mouth.style.width = "60%";
    mouth.style.borderRadius = "50px 50px 500px 500px";
}

function mouth2(){
    mouth.style.height = "15vh";
    mouth.style.width = "70%";
    mouth.style.borderRadius = "50px 50px 100px 100px";
}

function mouth3(){
    mouth.style.height = "13vh";
    mouth.style.width = "50%";
    mouth.style.borderRadius = "50px 50px 80px 80px";
}


function mouth4(){
    mouth.style.height = "15vh";
    mouth.style.width = "20%";
    mouth.style.borderRadius = "50px 50px 50px 50px";
}


function mouth5(){
    mouth.style.height = "8vh";
    mouth.style.width = "50%";
    mouth.style.borderRadius = "100px 100px 9px 9px";
}

mouth5();

test.addEventListener("click",()=>{mouth2()})














let talkingInterval = null;

function startTalking() {
  const mouthShapes = [mouth1, mouth2, mouth3, mouth4, mouth5];

  talkingInterval = setInterval(() => {
    const randomMouth = mouthShapes[
      Math.floor(Math.random() * mouthShapes.length)
    ];
    randomMouth();
  }, 120); // speed of mouth movement
}

function stopTalking() {
  clearInterval(talkingInterval);
  mouth5(); // resting mouth
}







// Vowel → mouth function
const vowelMap = {
  a: mouth1, // wide open
  e: mouth2,
  i: mouth3,
  o: mouth4, // round
  u: mouth5
};




function getMouthForWord(word) {
  word = word.toLowerCase();

  for (let char of word) {
    if (vowelMap[char]) {
      return vowelMap[char];
    }
  }

  return mouth5; // neutral if no vowel
}




function speakWithSync(text) {
  const words = text.split(" ");
  let index = 0;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;

  utterance.onstart = () => {
    animateWords();
  };

  utterance.onend = () => {
    mouth5(); // rest mouth
  };

  speechSynthesis.speak(utterance);

  function animateWords() {
    if (index >= words.length) return;

    const mouthFunc = getMouthForWord(words[index]);
    mouthFunc();

    index++;
    setTimeout(animateWords, 220); // timing per word
  }
}




test.addEventListener("click", () => {
  speakWithSync("Hello this mouth moves with vowels");
});

