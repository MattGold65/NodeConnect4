/*
Function that reveals the password when the user checks show password. 
Utilized in login.html and signup.html
*/
function showPassword() {
    var x = document.getElementById("password");
    if (x.type === "password") {
      x.type = "text";
    } else {
      x.type = "password";
    }
  }