
let params = new URLSearchParams(window.location.search);
// console.log(things.keys())

// SEARCH PARAMS
// S - DISCORD TAG OF SENDER
// R - DISCORD TAG OF RECEIVER
// KEY - CRYPTO KEY OF REQUEST

let verified = ['S', 'R', 'KEY'].every(param => params.has(param));

let S, R, KEY;
if(verified) {
    S = params.get("S");
    S = S.slice(0,-4) + '#' + S.slice(-4);
    R = params.get("R");
    R = R.slice(0, -4) + '#' + R.slice(-4);
    KEY = params.get("KEY");

    document.getElementById("user-from").innerText = S;
    document.getElementById("user-to").innerText = R;
}

if(!verified) {
    document.getElementById("submit-burrito").style.display = 'none';
    document.getElementById("header-header").innerText = "Uh oh! Something went wrong."
    document.getElementById("header-subheader").innerText = "This is supposed to be accessed solely through Peepsbot, a Discord bot. You can still mess around here, but there's no submit button."

}

let images = {};

let strokes = [];
let activestrokes = [];
let pressedKeys = [];

const basefolder = "./Icons/";
let imagepaths = ["hug.svg", "smiling_face.svg", "lemonthink.png", "doggowave.jpeg", "sparkles.svg"];

let TOOL = "PEN";
let STAMP;

let SHOWSTROKESLIDER = false;

for(const imagepath of imagepaths) {
    let img = document.createElement("img");
    img.src = basefolder + imagepath;
    let div = document.createElement("div");
    div.className = "stamps-elem";
    div.appendChild(img);
    div.addEventListener("click", () => {
        TOOL = "STAMP";
        STAMP = imagepath;
    })
    document.getElementById("stamps").appendChild(div);
}

document.getElementById("pen").addEventListener("click", () => {
    TOOL = "PEN";
    CURR = undefined;
})

document.getElementById("delete").addEventListener("click", () => {
    TOOL = "DELETE";
    CURR = undefined;
})

document.getElementById("stroke-weight-please-end-me").addEventListener("click", () => {
    SHOWSTROKESLIDER = !SHOWSTROKESLIDER;

    document.getElementById("stroke-weight-slider-menu").hidden = !SHOWSTROKESLIDER;
})

document.addEventListener("click", (e) =>{
    if(!e.target.closest("#stroke-weight-button")) {
        SHOWSTROKESLIDER = false;
        document.getElementById("stroke-weight-slider-menu").hidden = !SHOWSTROKESLIDER;
    }
})

let modal = async (header,message) => {
    document.getElementById("modal-header").innerText = header;
    document.getElementById("modal-message").innerText = message;

    document.getElementById("modal").hidden = false;

    return new Promise((res,rej) => {
        let removeListeners = () => {
        };
        let yesFunction = () => {
            removeListeners();
            res(true);
        }
        let noFunction = () => {
            removeListeners();
            res(false);
        }
        removeListeners = () => {
            document.getElementById("modal-yes").removeEventListener("click", yesFunction);
            document.getElementById("modal-no").removeEventListener("click", noFunction);
            document.getElementById("modal").hidden = true;
        }
        document.getElementById("modal-yes").addEventListener("click", yesFunction);
        document.getElementById("modal-no").addEventListener("click", noFunction);
    })
}

let clearBoard = () => {
    strokes = [];
}

document.getElementById("clear-board").addEventListener("click", async () => {
    if(await modal("Clear Board", "Do you really want to clear the board? This action is IRREVERSIBLE.")) clearBoard();
})


let cmdDown = () => {
    for(let key of [17,91,93]) {
        if(pressedKeys.includes(key)) {
            return true;
        }
    }
    return false;
}

class Stamp {
    constructor(x,y,size,angle,imagepath) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.angle = angle;
        this.imagepath = imagepath;
        this.height = this.size;
        this.width = images[this.imagepath].width / images[this.imagepath].height * this.size;
    }

    render() {
        push();
        imageMode(CENTER);
        translate(this.x, this.y);
        rotate(this.angle);
        image(images[this.imagepath], 0, 0, this.width,  this.height);
        pop();
    }
}

class Stroke {

    constructor(x,y,s,colour) {
        this.stroke = [[x,y]];
        this.finished = false;
        this.size = s;
        this.colour = colour || "#000000";
    }

    add(x,y) {
        this.stroke.push([x,y]);
    }

    render() {

        strokeCap(ROUND);

        strokeWeight(this.size);
        noFill();
        stroke(this.colour);
        // beginShape();
        for(let i = 0; i < this.stroke.length-1; i++) {
            line(this.stroke[i][0],this.stroke[i][1],
                this.stroke[i+1][0], this.stroke[i+1][1],);
        }
        // endShape();
    }
}

class DeletionBox {
    constructor(x,y)  {
        this.x = x;
        this.y = y;
        this.x2 = x;
        this.y2 = y;
    }

    render() {
        this.width = this.x2 - this.x;
        this.height = this.y2 - this.y;
        fill(255,0,0,100);
        stroke(255,0,0,200);
        strokeWeight(2);
        rect(this.x,this.y,this.width,this.height);
    }

    collisionPoint(x,y) {
        return x >= this.x && y >= this.y && x <= this.x2 && y <= this.y2;
    }

    collisionBox(x,y,w,h) {
        return x + w >= this.x && y + h >= this.y && this.x2 >= x && this.y2 >= y; 
    }

    collision(thing) {
        if(thing instanceof Stroke) {
            for(const p of thing.stroke) {
                if(this.collisionPoint(p[0],p[1])) {
                    return true;
                }
            }
            return false;
        } else if(thing instanceof Stamp) {
            // IMAGE MODE CENTER!
            return this.collisionBox(thing.x - thing.width/2, thing.y - thing.height/2, thing.width, thing.height);
        }
    }

    update(x,y) {
        this.x2 = x;
        this.y2 = y;
    }

    end() {
        ;[this.x, this.x2] = [Math.min(this.x, this.x2), Math.max(this.x, this.x2)];
        ;[this.y, this.y2] = [Math.min(this.y, this.y2), Math.max(this.y, this.y2)];
    }
}

let cnv;
function setup() {
    cnv = createCanvas(400, 400);
    cnv.id("cnv");
    cnv.parent("container");

    cnv.mousePressed( () => {
        if (TOOL === "PEN") {
            let color = document.getElementById("colour-input").value;
            let sw = parseInt(document.getElementById("stroke-width").value);
            CURR = new Stroke(mouseX, mouseY, sw, color);
            strokes.push(CURR);
        }

        if (TOOL === "DELETE") {
            CURR = new DeletionBox(mouseX, mouseY);
        }
    });

    for (const name of imagepaths) {
        images[name] = loadImage(basefolder + name);
    }

}

function draw(finalrender) {
    if(finalrender) {
        background(255);
    } else {
        background(230);
    }
    
    
    activestrokes = [];
    for(const s of strokes) {
        if(s instanceof DeletionBox) {
            for (const v of [...activestrokes]) {
                if (s.collision(v)) {
                    activestrokes = activestrokes.filter(a => a !== v);
                }

            }
        } else {
            activestrokes.push(s);
        }
    }
    // RENDER
    for (const s of activestrokes) {
        s.render();
    }

    // TOOLS
    if(TOOL === "PEN") {
        let sw = parseInt(document.getElementById("stroke-width").value);
        let color = document.getElementById("colour-input").value;
        fill(color);
        noStroke();
        ellipse(mouseX, mouseY, sw, sw);

        if (mouseIsPressed) {
            if (CURR) {
                CURR.add(mouseX, mouseY);
            } else if(mouseX >= 0) {
                
            }
        } else {
            CURR = undefined;
        }
    }
    if(TOOL === "DELETE") {
        fill(255,0,0,100);
        noStroke();
        ellipse(mouseX, mouseY, 5, 5);

        if(mouseIsPressed) {
            if (CURR) {
                CURR.update(mouseX, mouseY);
                CURR.render();
            } 
        } else {
            if(CURR) {
                CURR.end() // makethings aligned
                strokes.push(CURR);
                CURR = undefined;
            }
        }
    }
    else if(TOOL === "STAMP") {
        let size = 50;
        new Stamp(mouseX, mouseY, size, 0, STAMP).render();
    }
    

    if(SHOWSTROKESLIDER || frameCount === 1) {
        let stw = parseInt(document.getElementById("stroke-width").value);
        let icon = document.getElementById("stroke-weight-icon");
        icon.style.width = icon.style.height = `${stw}px`;

    }
}

function mouseClicked() {
    if(TOOL === "STAMP") {
        let size = 50;
        let angle = map(random(),0,1,-0.3,0.3);
        strokes.push(new Stamp(mouseX, mouseY, size, angle, STAMP));
    }
}



document.getElementById("undo").addEventListener("click", () => {
    if (CURR) {
        CURR = undefined;
        strokes.pop();
    } else {
        strokes.pop();
    }
})

document.addEventListener('keydown', function (event) {
    // On command z
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        if (CURR) {
            CURR = undefined;
            strokes.pop();
        } else {
            strokes.pop();
        }
    }

    if(event.key === '-') {
        document.getElementById("stroke-width").value = "" + (parseInt(document.getElementById("stroke-width").value) - 1);
    }
    if (event.key === '=') {
        document.getElementById("stroke-width").value = "" + (parseInt(document.getElementById("stroke-width").value) + 1);
    }
});

let CURR = undefined;

let postImage = (async () => {

    let promisething = new Promise((res,rej) => {
        draw(true); // rerender as white
        document.getElementById("cnv").toBlob((b) => {
            res(b);
        });
    })
    let bleb = await promisething;

    var formData = new FormData();

    formData.append("username", `Webhook`);
    formData.append("content", KEY);

    formData.append("file", bleb, "test.png");

    let webhook = "https://discord.com/api/webhooks/839207925217624105/aqJ-Xflw_c7ZJt1XvFXbQvZsj0WyC9ctnEkBlpSjZoxiqG_YUQr7KE_LeiyREsVvILZX";
    var request = new XMLHttpRequest();
    request.open("POST", webhook);
    request.send(formData);

    let responsepromise = new Promise((res,rej) => {
        request.onload = (r) => {
            res(r);
        }
        request.onerror = (e) => {
            rej(e);
        }
    })
    await responsepromise;
    

    // window.location =  + '/done'
    let base = window.location.href.slice(0,window.location.href.length-new URL(window.location.href).search.length);
    if(base.charAt(base.length-1) === '/') {
        base = base.slice(0,-1);
    }
    // console.log(base + '/done');
    window.location.href = base + '/done';

});

document.getElementById("submit").addEventListener("click",async () => {
    if(await modal("Submit Image?", "You cannot resubmit or edit the signature after! Are you sure you want to do this?")) {
        postImage();
    }
});