
/*
var obj = {
	table: []
 };
 obj.table.push({id: 1, square:2});
 var json = JSON.stringify(obj);
 var fs = require('browserify-fs');
fs.writeFile('myjsonfile.json', json,  (err)=>{
	console.log('sjdbc')
});*/
var Peer = require('simple-peer');//for video calling 
var isSkin = require('skintone');//returns true for skin pixels 
const video = document.querySelector('video');// local video element
var messageBox = document.getElementById('message-box');//message container 
var resultArea = document.getElementById("pred-result");//predicted text
const IMAGE_SIZE = 224;
var socket = io();
var client = {};
var gstream = null
var prevData=null;
const TOPK = 10;

const predictionThreshold = 0.9999;

var words = ['ok google', 'send','other'];
var name = null;
var knn;
var featureExtractor;
var model;
var poses = [];
var poseNet;
var options={imageScaleFactor: 1.0,
		outputStride: 16,
		flipHorizontal: false,
		minConfidence: 0.2,
		maxPoseDetections: 3,
		scoreThreshold: 0.5,
		nmsRadius: 20,
		detectionType: 'single',
		multiplier: 1.0,
	}
var x;
var y;
var prevx = 540;
var prevy = 262;
var alphInd = -1

var blueSlider = document.getElementById("blueRange");
var blueValue = document.getElementById("blueValue");
blueValue.innerHTML = blueSlider.value;
var greenSlider = document.getElementById("greenRange");
var greenValue = document.getElementById("greenValue");
greenValue.innerHTML = greenSlider.value;
var redSlider = document.getElementById("redRange");
var redValue = document.getElementById("redValue");
redValue.innerHTML = redSlider.value;


blueSlider.oninput = function() {
  blueValue.innerHTML = blueSlider.value;
}
greenSlider.oninput = function() {
  greenValue.innerHTML = greenSlider.value;
}
redSlider.oninput = function() {
  redValue.innerHTML = redSlider.value;
}
/*
var lhSlider = document.getElementById("lhRange");
var lhValue = document.getElementById("lhValue");
lhValue.innerHTML = lhSlider.value;
var lsSlider = document.getElementById("lsRange");
var lsValue = document.getElementById("lsValue");
lsValue.innerHTML = lsSlider.value;
var lvSlider = document.getElementById("lvRange");
var lvValue = document.getElementById("lvValue");
lvValue.innerHTML = lvSlider.value;


lhSlider.oninput = function() {
  lhValue.innerHTML = lhSlider.value;
}
lsSlider.oninput = function() {
  lsValue.innerHTML = lsSlider.value;
}
lvSlider.oninput = function() {
  lvValue.innerHTML = lvSlider.value;
}

var hhSlider = document.getElementById("hhRange");
var hhValue = document.getElementById("hhValue");
hhValue.innerHTML = hhSlider.value;
var hsSlider = document.getElementById("hsRange");
var hsValue = document.getElementById("hsValue");
hsValue.innerHTML = hsSlider.value;
var hvSlider = document.getElementById("hvRange");
var hvValue = document.getElementById("hvValue");
hvValue.innerHTML = hvSlider.value;


hhSlider.oninput = function() {
  hhValue.innerHTML = hhSlider.value;
}
hsSlider.oninput = function() {
  hsValue.innerHTML = hsSlider.value;
}
hvSlider.oninput = function() {
  hvValue.innerHTML = hvSlider.value;
}

*/

var canvas1 = document.getElementById('canvas1');
var context1 = canvas1.getContext('2d');

var canvas2 = document.getElementById('canvas2');
var context2 = canvas2.getContext('2d');
var canvas3 = document.getElementById('canvas3');
var context3 = canvas3.getContext('2d');


navigator.getUserMedia = navigator.getUserMedia ||
navigator.webkitGetUserMedia ||
navigator.mozGetUserMedia;

async function setupCamera() {
	

	if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
		throw new Error(
			'Browser API navigator.mediaDevices.getUserMedia not available');
	}
	video.width = IMAGE_SIZE;
	video.height = IMAGE_SIZE;
	const stream = await navigator.mediaDevices.getUserMedia({
		'audio': false,
		'video': true
	});
	video.srcObject = stream;
	gstream = stream;
	

	poseNet = ml5.poseNet(video, options, modelReady);
	// This sets up an event that fills the global variable "poses"
    // with an array every time new poses are detected
    
	poseNet.on('pose', function(results) {
		poses = results;
	});
    

	return new Promise((resolve) => {
		video.onloadedmetadata = () => {
            //context1.translate(300, 0);
            //context1.scale(-1, 1);
		resolve(video);
		};
	});
}



/* POSE NET */

function modelReady() {
	console.log('model ready')
	video.addEventListener('play', async function () {
      
    //console.log(model.predict(tf.browser.fromPixels(video)))
		var $this = this; //cache
		(function loop() {
			if (!$this.paused && !$this.ended) {
                context1.drawImage($this, 0, 0, 224, 244);
                //processImg();
				computeFrame();
				drawKeypoints();
				drawSkeleton();
				setTimeout(loop, 1000 / 30); // drawing at 30fps
			}
		})();
	});
}
  
function drawKeypoints()  {
	// Loop through all the poses detected
	for (let i = 0; i < poses.length; i++) {
	  // For each pose detected, loop through all the keypoints
	  let pose = poses[i].pose;
	  for (let j = 0; j < pose.keypoints.length; j++) {
		// A keypoint is an object describing a body part (like rightArm or leftShoulder)
		let keypoint = pose.keypoints[j];
		// Only draw an ellipse is the pose probability is bigger than 0.2
		if (keypoint.score > 0.2) {
            context2.beginPath();
            context2.arc(keypoint.position.x, keypoint.position.y, 3, 0, 2 * Math.PI);
            context2.fillStyle = '#7f584d';
            context2.fill();
		}
	  }
	}
}
  
  // A function to draw the skeletons
  function drawSkeleton() {
	// Loop through all the skeletons detected
	for (let i = 0; i < poses.length; i++) {
	  let skeleton = poses[i].skeleton;
	  // For every skeleton, loop through all body connections
	  for (let j = 0; j < skeleton.length; j++) {
		let partA = skeleton[j][0];
		let partB = skeleton[j][1];
		context2.beginPath();       // Start a new path
		context2.moveTo(partA.position.x, partA.position.y);    
		context2.lineTo(partB.position.x, partB.position.y);
		context2.strokeStyle = '#7f584d';
		context2.lineWidth = 6
		context2.stroke();       
    
	  }
	}
  }





/* SKIN TONE RECOGNITION */

function computeFrame() {
	let rrange=parseFloat(redSlider.value);
	let grange=parseFloat(greenSlider.value);
	let brange=parseFloat(blueSlider.value)
	let frame = context1.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);
		let l = frame.data.length / 4;
	for (let i = 0; i < l; i++) {
		let r = frame.data[i * 4 + 0];
		let g = frame.data[i * 4 + 1];
		let b = frame.data[i * 4 + 2];
		if (!isSkin(r+rrange,g+grange,b+brange)) {
		frame.data[i * 4 + 3] = 0;
		}   
	}
	
	context2.putImageData(frame, 0, 0);
	let src = cv.imread(canvas2);
	let dst = new cv.Mat();
	cv.medianBlur(src, dst, 3);
	let M = cv.Mat.ones(3, 3, cv.CV_8U);
	let anchor = new cv.Point(-1, -1);
	cv.morphologyEx(src, dst, cv.MORPH_OPEN, M, anchor, 1,
					cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
	
	cv.imshow(canvas2,dst)
	src.delete();
	dst.delete();
	M.delete();
	return;
}



class Main  {
    constructor()   {
        this.wcs = document.getElementsByClassName("wcs");
        this.allSliders = document.getElementsByClassName("rgbValues")
        //this.allmpb = document.getElementsByClassName("mpb")
        this.ddMode = document.getElementById("dd-mode");
        this.normalMode = document.getElementById("normal-mode");
        this.trainingListDiv = document.getElementById("training-list");
        this.predResults = document.getElementById("subs");
        this.trainingListDiv = document.getElementById("training-list");
        this.exampleListDiv = document.getElementById("example-list");
		this.addWordForm = document.getElementById("add-word");
        this.img = document.getElementById("image")
        this.previousPrediction2 = 0
		this.toggle = document.getElementById("toggle")
		this.mode = null;
        this.infoTexts = [];
        this.training = -1; // -1 when no class is being trained
        this.videoPlaying = false;
		this.status = document.getElementById('status-text');
        this.previousPrediction = -1;
        this.currentPredictedWords = [];
        this.round = 0;
        


        // variables to restrict prediction rate
        this.now;
        this.then = Date.now();
        this.startTime = this.then;
        this.fps = 2; //framerate - number of prediction per second for gesture
        this.fpsInterval = 1000/(this.fps);
        this.fps2 = 1.5;
        this.fpsInterval2 = 1000/(this.fps2);
        this.elapsed = 0;

        //removing elements
        messageBox.style.display = "none";
        this.trainingListDiv.style.display = "none";
		video.style.display = "none";
		this.toggle.style.display = "none";
		this.status.style.display ="none";


        // add word to training example set
        this.addWordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            let word = document.getElementById("new-word").value.trim().toLowerCase();

            if(word && !words.includes(word)){
                //console.log(word)
                words.splice(words.length-1,0,word) //insert at penultimate index in array
                this.createButtonList(false)
                this.updateExampleCount()
                //console.log(words)

                document.getElementById("new-word").value = ''

                // console.log(words)

            } else {
                alert("Duplicate word or no word entered")
            }

            return
        })

        this.updateExampleCount()

        this.createTrainingBtn()

        this.createButtonList(false)

    }

    welcomeScreen()    {
		for (let i=0;i<this.allSliders.length;i+=1){
			this.allSliders[i].style.display = 'none';
		}

		this.loadKNN()
		
        this.ddMode.addEventListener("click", () => {
            console.log("mode: deaf-dumb")
            for (let i=0;i<this.wcs.length;i+=1){
                this.wcs[i].style.display = 'none';
            }
            let nameInput = document.getElementById("name");
            name = nameInput.value;
            name = name.toUpperCase() + ": " ;
            this.trainingScreen();
        })
        this.normalMode.addEventListener("click", () => {
            console.log("mode: normal")
            for (let i=0;i<this.wcs.length;i+=1){
                this.wcs[i].style.display = 'none';
            }
            canvas1.style.display = "none";
            canvas2.style.display = "none";
            video.style.display = "block";
            video.play();
            let talk = document.getElementById("mpb-button");
            talk.style.display = "block";
            talk.innerHTML = "click to start speaking";
            talk.addEventListener("click", () => {
              console.log("started speech recognition");
              speechrecognition();
            })
            let nameInput = document.getElementById("name")
            name = nameInput.value
            name = name.toUpperCase() + ": " 
            videoCall()
        })
    }

    trainingScreen()   {
        canvas1.style.display = "none"
        canvas3.style.display = "none"
        video.style.display = "block";
        video.play();
        this.videoPlaying = true;
		this.trainingListDiv.style.display = "block"
		for (let i=0;i<this.allSliders.length;i+=1){
			this.allSliders[i].style.display = 'block';
		}
    }

    createTrainingBtn(){
      //this.nominee = new Array(words.length).fill(0)
        var div = document.getElementById("action-btn")
        div.innerHTML = ""
    
        const trainButton = document.createElement('button')
        trainButton.id = "train-button"
        trainButton.innerText = "Training >>>"
		div.appendChild(trainButton);

		const loadButton = document.createElement('button');
		loadButton.id = "load-button";
		loadButton.innerText = "load Model";
		div.appendChild(loadButton);

		loadButton.addEventListener('click', () => {
			knn.load('./myKnnDataset.json', () => {
				var fs = require("browserify-fs");

				fs.readFile("temp.txt", function(err, buf) {
					words = buf.toString().split(',')
					console.log(words)
				});
			});
		})
		
    
        trainButton.addEventListener('mousedown', () => {
    
            if(words.length == 3){
                var proceed = confirm("You have not added any words.\n\nThe only query you can currently make is: 'hello'")
        
                if(!proceed) return
            }
			console.log("ready to train")
            this.createButtonList(true)
            this.addWordForm.innerHTML = ''
            this.createVideoCallButton()
            this.createPredictBtn()
        })
    }
    
    async loadKNN(){
        knn = ml5.KNNClassifier();
        featureExtractor = await ml5.featureExtractor("MobileNet", () => {
          console.log("mobileNet Loaded");
        });
        //featureExtractor = await mobilenet.load();
    }


    createButtonList(showBtn){
        //showBtn - true: show training btns, false:show only text
    
        // Clear List
        this.exampleListDiv.innerHTML = ""
    
        // Create training buttons and info texts
        for(let i=0;i<words.length; i++){
          this.createButton(i, showBtn)
        }
    }

    createButton(i, showBtn){
        const div = document.createElement('div');
        this.exampleListDiv.appendChild(div);
        div.style.marginBottom = '10px';
    
        // Create Word Text
        const wordText = document.createElement('span')
    
        if(i==0 && !showBtn){
          wordText.innerText = words[i].toUpperCase()
        } else if(i==words.length-1 && !showBtn){
          wordText.innerText = words[i].toUpperCase()
        } else {
          wordText.innerText = words[i].toUpperCase()+" "
          wordText.style.fontWeight = "bold"
        }
    
    
        div.appendChild(wordText);
    
        if(showBtn){
          // Create training button
          const button = document.createElement('button')
          button.innerText = "Add Example"//"Train " + words[i].toUpperCase()
          div.appendChild(button);
    
          // Listen for mouse events when clicking the button
          button.addEventListener('click', async () => {
			for(let j=0; j<50; j++) { 
				await this.sleep(100)
				this.training = i;
				// Get image data from video element
				//console.log(image.dataSync())
				const logits = featureExtractor.infer(canvas2);
				// Train class if one of the buttons is held down
				
				knn.addExample(logits, this.training);

				// Add current image to classifier
				
		
		
			const exampleCount = knn.getCount()
			//console.log(exampleCount);
		
			//if(Math.max(...exampleCount) > 0){
				if(exampleCount[i] > 0){
					this.infoTexts[i].innerText = ` ${exampleCount[i]} examples`
				}
            
          //}
          }
          });
    
          // Create clear button to emove training examples
          const btn = document.createElement('button')
          btn.innerText = "Clear"//`Clear ${words[i].toUpperCase()}`
          div.appendChild(btn);
    
          btn.addEventListener('mousedown', () => {
            console.log("clear training data for this label");
            knn.clearLabel(i);
            this.infoTexts[i].innerText = " 0 examples";
          })
    
          // Create info text
          const infoText = document.createElement('span')
          infoText.innerText = " 0 examples";
          div.appendChild(infoText);
          this.infoTexts.push(infoText);
        }
    }

    
    
   

    updateExampleCount(){
        var p = document.getElementById('count')
        p.innerText = `Training: ${words.length} words`
    }



    createVideoCallButton() {
        let howTo = document.getElementById("howTo");
        howTo.innerHTML = "Try training on an empty background </br>Train the gestures slowly";
        let div = document.getElementById("action-btn");
        div.innerHTML = "";
        const videoCallButton = document.createElement('button');
        div.appendChild(videoCallButton);
        videoCallButton.innerText = "Start VideoCalling >>>";

		const saveButton = document.createElement('button');
		saveButton.id = "save-button";
		saveButton.innerText = "Save Model";
		div.appendChild(saveButton);

		saveButton.addEventListener('click', () => {
			knn.save('myKnnDataset');
			var fs = require("browserify-fs");

			var data = words.toString();

			fs.writeFile("temp.txt", data, (err) => {
			if (err) console.log(err);
			console.log("Successfully Written to File.");
			});
		})

        videoCallButton.addEventListener("click", () => {
            this.trainingListDiv.style.display = "none"
            videoCall();
		})
		
		const assist = document.createElement('button');
		assist.id = "g-assist";
		assist.innerText = "talk-to-assistant";
		div.appendChild(assist);

		assist.addEventListener('click' ,() => {
			this.trainingListDiv.style.display = "none"
			googleAssistant();
		})


    }
    
    createPredictBtn(){
        var predButton = document.getElementById("mpb-button");
        predButton.innerHTML = "start predicting";
        
        predButton.addEventListener('click', () => {
            const exampleCount = knn.getCount();
            //console.log(Math.max(...exampleCount));
            // check if training has been done
            // if wake word has not been trained
			console.log("start predicting")
			this.status.innerHTML="STARTED PREDICTING"
            if(exampleCount[1] == 0){
            alert(
                `You haven't added examples for the wake word SEND`
                )
            return
            }
        
            // if the catchall phrase other hasnt been trained
            if(exampleCount[words.length-1] == 0){
            alert(
                `You haven't added examples for the catchall sign OTHER.\n\nCapture yourself in idle states e.g hands by your side, empty background etc.\n\nThis prevents words from being erroneously detected.`)
            return
            }
            this.startPredicting()
        })
    }
      
    startPredicting(){
		main.status.innerHTML = "STARTED PREDICTING";
		resultArea.innerHTML = '';
        this.pred = requestAnimationFrame(this.predict.bind(this));
    }

    pausePredicting(){
		console.log("pause predicting");
		this.status.innerHTML = "PAUSED PREDICTING"
        cancelAnimationFrame(this.pred)
    }

    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    

    async predict (){
        this.now = Date.now()
        let index
        this.elapsed = this.now - this.then
        if(this.elapsed > this.fpsInterval){
          this.then = this.now - (this.elapsed % this.fpsInterval);
          if(this.videoPlaying){
                const logits = featureExtractor.infer(canvas2)
                knn.classify(logits, TOPK, (err, result) => {
					if(err)	{
						console.log(err); 
					}
                    if(result.confidences[result.classIndex] > predictionThreshold &&
                        result.classIndex != this.previousPrediction &&
                        result.classIndex != words.length-1){
                        
                            if(result.classIndex == 1)	{
								socket.emit('chat', name + resultArea.innerHTML);
								console.log('speaking sentence')
								$('#toggle').trigger('click');
                                resultArea.innerHTML = '';
                            }
                            else    {
                                resultArea.innerHTML = resultArea.innerHTML + " " + words[result.classIndex];
							}
							this.previousPrediction2 =this.previousPrediction;
                            this.previousPrediction = result.classIndex;
                        
                        }
                }).then(logits.dispose())
          	}
        }
        this.pred = requestAnimationFrame(this.predict.bind(this));
    }
}


function googleAssistant()	{
	main.status.style.display="block";
	let div = document.createElement('div');
	$('#toggle').bind('click', function() {
		main.pausePredicting()
		main.status.innerHTML = "SPEAKING"
		let msg = new SpeechSynthesisUtterance(resultArea.innerHTML);
		window.speechSynthesis.speak(msg);
		msg.onend = (evt) => {
			msg=null;
			if(main.previousPrediction2 != 0)	{
				speechrecognition2();
			}
			else	{
				main.startPredicting();
			}
			
		}
		 
   })
   
}

function speechrecognition2(){
	main.status.innerHTML = "LISTENING"
	console.log('reconition started');
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.addEventListener('result', e => {
        transcript = Array.from(e.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
        resultArea.innerHTML = transcript
    });

    recognition.onspeechend = () => {
		console.log('reconition stopped');
		recognition.stop();
		main.startPredicting();
    }
    recognition.start();
}





async function videoCall()    {
	messageBox.style.display = "block"
    socket.emit('NewClient')
        //used to initialize a peer
	function InitPeer(type) {
		let peer = new Peer({ initiator: (type == 'init') ? true : false, stream: gstream, trickle: false })
		peer.on('stream', function (stream) {
			CreateVideo(stream)
		})
		peer.on('data', function (data) {
			let decodedData = new TextDecoder('utf-8').decode(data)
			let peervideo = document.querySelector('#peerVideo')
		})
		return peer
	}

	//for peer of type init
	function MakePeer() {
		client.gotAnswer = false
		let peer = InitPeer('init')
		peer.on('signal', function (data) {
			if (!client.gotAnswer) {
				socket.emit('Offer', data)
			}
		})
		client.peer = peer
	}

	//for peer of type not init
	function FrontAnswer(offer) {
		let peer = InitPeer('notInit')
		peer.on('signal', (data) => {
			socket.emit('Answer', data)
		})
		peer.signal(offer)
		client.peer = peer
	}

	function SignalAnswer(answer) {
		client.gotAnswer = true
		let peer = client.peer
		peer.signal(answer)
	}

	function CreateVideo(stream) {
		let video = document.createElement('video')
		video.id = 'peerVideo'
		video.srcObject = stream
		video.setAttribute('class', 'embed-responsive-item')
		document.querySelector('#peerDiv').appendChild(video)
		video.play()
		console.log("started session successfully")
	}

	function SessionActive() {
		document.write('Session Active. Please come back later')
	}



	function RemovePeer() {
		document.getElementById("peerVideo").remove();
		if (client.peer) {
			client.peer.destroy()
		}
	}

	socket.on('BackOffer', FrontAnswer)
	socket.on('BackAnswer', SignalAnswer)
	socket.on('SessionActive', SessionActive)
	socket.on('CreatePeer', MakePeer)
	//socket.on('Disconnect', RemovePeer)
}


function checkName(data)	{
	for(let i=0; i<name.length; i++)	{
		if(name[i]!=data[i])	{
			return false;
		}
	}
	return true;
}

/*speech recognition*/
var transcript;
function speechrecognition(){
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.addEventListener('result', e => {
        transcript = Array.from(e.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
        resultArea.innerHTML = transcript
    });

    recognition.onspeechend = () => {
        resultArea.innerHTML = '';
        socket.emit('chat',name + transcript);
    }

    recognition.addEventListener('end', recognition.start);
    recognition.start();
}


socket.on('chat', function(data){
	messageBox.innerHTML = messageBox.innerHTML + data + '&#13;&#10;'//<--got to new line
	messageBox.scrollTop = messageBox.scrollHeight
	
    $('#message-box').bind('click', function() {
		if(prevData!=data && !checkName(data))	{
			let msg = new SpeechSynthesisUtterance(data);
			window.speechSynthesis.speak(msg);
			msg=null;
			prevData = data;
		} 
   })
    
});



var main = null
window.addEventListener('load', () => {
    main = new Main();
    main.welcomeScreen();
    setupCamera();
});