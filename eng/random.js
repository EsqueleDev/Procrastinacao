const backgroundPick = Math.floor(Math.random() * 5);

switch (backgroundPick){
    case 0:
        document.getElementById("bodyContainer").style.background = "url(https://i.ibb.co/Q8Mrjtw/purpl014.jpg)";
        break;
    case 1:
        document.getElementById("bodyContainer").style.background = "url(https://i.ibb.co/cytWKGs/purpl054.gif)";
        break;
    case 2:
        document.getElementById("bodyContainer").style.background = "url(https://i.ibb.co/Pm5QWYW/red040.jpg)";
        break;
    case 3:
        document.getElementById("bodyContainer").style.background = "url(https://i.ibb.co/4YC7wZN/red028.jpg)";
        break;
    case 4:
        document.getElementById("bodyContainer").style.background = "url(https://i.ibb.co/cgKGWBr/red014.jpg)";
        break;
    case 5:
        document.getElementById("bodyContainer").style.background = "url(https://i.ibb.co/dtC9N2v/red004.jpg)";
        break;
}

const logo = Math.floor(Math.random() * 1);

switch (logo){
    case 0:
        document.getElementById("logo").src = "Procrastinao-Procrastinao.png";
        break;

    case 1:
        document.getElementById("logo").src = "Procrastinao.png";
        break;
}