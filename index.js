// ML
const classifier = knnClassifier.create();
let net;

var training_samples = [0,0,0];
var has_game_started = false;


// Start the classifier
async function app() {
  console.log('Loading mobilenet..');

  // Load the model.
  net = await mobilenet.load();
  console.log('Sucessfully loaded model');

  try {
    await setupWebcam();
  }  
  catch(err){
    alert("It was not possible to setup the webcam.");
  }

  // Reads an image from the webcam and associates it with a specific class
  // index.
  const addExample = classId => {
    // Get the intermediate activation of MobileNet 'conv_preds' and pass that
    // to the KNN classifier.
    const activation = net.infer(webcamElement, 'conv_preds');
    training_samples[classId] += 1
    // Pass the intermediate activation to the classifier.
    classifier.addExample(activation, classId);

    document.getElementById('num_training_' + classId).innerText = training_samples[classId];
  };

  // When clicking a button, add an example for that class.
  document.getElementById('class-0').addEventListener('click', () => addExample(0));
  document.getElementById('class-1').addEventListener('click', () => addExample(1));
  document.getElementById('class-2').addEventListener('click', () => addExample(2));


  while (true) {
    if (classifier.getNumClasses() > 0) {
      // Get the activation from mobilenet from the webcam.
      const activation = net.infer(webcamElement, 'conv_preds');
      // Get the most likely class and confidences from the classifier module.
      const result = await classifier.predictClass(activation);

      const classes = ['Move Up', 'Stop', 'Move Down'];
      document.getElementById('action').innerText = classes[result.classIndex];
      document.getElementById('probability').innerText = result.confidences[result.classIndex];

      if (has_game_started){
        gameaction(result.classIndex);
      }
    }

    await tf.nextFrame();
  }
}


async function setupWebcam() {
  return new Promise((resolve, reject) => {
    const navigatorAny = navigator;
    navigator.getUserMedia = navigator.getUserMedia ||
        navigatorAny.webkitGetUserMedia || navigatorAny.mozGetUserMedia ||
        navigatorAny.msGetUserMedia;
    if (navigator.getUserMedia) {
      navigator.getUserMedia({video: true},
        stream => {
          webcamElement.srcObject = stream;
          webcamElement.addEventListener('loadeddata',  () => resolve(), false);
        },
        error => reject());
    } else {
      reject();
    }
  });
}


const webcamElement = document.getElementById('webcam');
app();



///// Game

var myGameArea;
var myGamePiece;
var myObstacles;
var myScore;

function startGame() {
    myGameArea = null;
    myGamePiece = null;
    myObstacles = []; 
    myScore = null;

    myGameArea = {
        canvas : document.createElement("canvas"),
        start : function() {
            document.getElementById("startGame").style.display = "none";

            div = document.getElementById("canvasArea");
            div.style.display = "inherit";
            div.style.height = "360px";
            this.canvas.id = "canvas";
            this.canvas.width = 540;
            this.canvas.height = 350;
            this.canvas.style.position = "absolute";
            this.canvas.style.marginLeft = "240px";
            this.canvas.style.border   = "1px solid";
            this.context = this.canvas.getContext("2d");
            this.frameNo = 0;
            this.interval = setInterval(updateGameArea, 20);
            div.append(this.canvas)
            },
        clear : function() {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    
    if (training_samples[0] > 9 && training_samples[1] > 9 && training_samples[2] > 9){
        myGamePiece = new component(30, 30, "blue", 50, 120);
        myGamePiece.gravity = 0.05;
        myScore = new component("30px", "Consolas", "black", 330, 40, "text");
        myGameArea.start();
        has_game_started = true;
    }
    else {
        alert('Record at least 10 image samples for each exhibited action.');
    }
    
}

function component(width, height, color, x, y, type) {
    this.type = type;
    this.score = 0;
    this.width = width;
    this.height = height;
    this.speedX = 0;
    this.speedY = 0;    
    this.x = x;
    this.y = y;
    this.moveUpDown = 0;

    this.update = function() {
        ctx = myGameArea.context;
        if (this.type == "text") {
            ctx.font = this.width + " " + this.height;
            ctx.fillStyle = color;
            ctx.fillText(this.text, this.x, this.y);
        } else {
            ctx.fillStyle = color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    this.newPos = function() {
        this.y += this.moveUpDown
        this.hitBottom();
    }

    this.hitBottom = function() {
        var rockbottom = myGameArea.canvas.height - this.height;
        if (this.y > rockbottom) {
            this.y = rockbottom;
        }

        if (this.y < 0){
            this.y = 0;
        }
    }

    this.crashWith = function(otherobj) {
        var myleft = this.x;
        var myright = this.x + (this.width);
        var mytop = this.y;
        var mybottom = this.y + (this.height);
        var otherleft = otherobj.x;
        var otherright = otherobj.x + (otherobj.width);
        var othertop = otherobj.y;
        var otherbottom = otherobj.y + (otherobj.height);
        var crash = true;
        if ((mybottom < othertop) || (mytop > otherbottom) || (myright < otherleft) || (myleft > otherright)) {
            crash = false;
        }
        return crash;
    }
}

function updateGameArea() {
    var x, height, gap, minHeight, maxHeight, minGap, maxGap;
    for (i = 0; i < myObstacles.length; i += 1) {
        if (myGamePiece.crashWith(myObstacles[i])) {
            alert('Game over!\n Your SCORE: ' + myGameArea.frameNo);
            clearInterval(myGameArea.interval);
            
            // update main page
            document.getElementById("canvas").remove();
            document.getElementById("canvasArea").style.display = "none";
            document.getElementById("startGame").style.display = "inherit";
            return;
        } 
    }
    myGameArea.clear();
    myGameArea.frameNo += 1;
    if (myGameArea.frameNo == 1 || everyinterval(150)) {
        x = myGameArea.canvas.width;
        minHeight = 20;
        maxHeight = 200;
        height = Math.floor(Math.random()*(maxHeight-minHeight+1)+minHeight);
        minGap = 50;
        maxGap = 200;
        gap = Math.floor(Math.random()*(maxGap-minGap+1)+minGap);
        myObstacles.push(new component(10, height, "green", x, 0));
        myObstacles.push(new component(10, x - height - gap, "green", x, height + gap));
    }
    for (i = 0; i < myObstacles.length; i += 1) {
        myObstacles[i].x += -1;
        myObstacles[i].update();
    }
    myScore.text="SCORE: " + myGameArea.frameNo;
    myScore.update();
    myGamePiece.newPos();
    myGamePiece.update();
}

function everyinterval(n) {
    if ((myGameArea.frameNo / n) % 1 == 0) {return true;}
    return false;
}

function up(){
    myGamePiece.moveUpDown = -1.5;
}

function stop(){
    myGamePiece.moveUpDown = 0.0;
}

function down(){
    myGamePiece.moveUpDown = 1.5;
}

function gameaction(class_id){

    switch(class_id){
        case 0: 
            up();
            break;
        case 2:
            down();
            break;
        default:
            stop();
    }
}


