# xnat-rest

Use xnat-rest API with this package. 

----
npm install xnat-rest
----

## Usage: 

To upload files using this library create a file (index.js) and add:

----
var xnat = require('xnat-rest');

xnat.upload();
----

### Help:

----
Usage: node index.js -d <directory> -p <project id>
Options:
-d <DICOM directory>, directory with DICOM files.
-p <project id>, project id in XNAT to upload the files.
--pid <patient id>, If patient id is specified, the patient id won't be extracted from the DICOM file.
--sessid <session id>, If session id is specified, the session id won't be extracted from the DICOM file.
--server <server url>, XNAT server url. When server is set, the user will be prompted for username and password
--prompt , If set, forces prompt for login information again. It will use the previous server URL saved in the configuration file
----

## Documentation:

### User login to xnat instance:

----

var user = {
	user: "username",
	password: "password"
}

xnat.login(user)
.then(function(){
	console.log("User is logged in.")
})
.catch(function(err){
	console.error("Login failed")
});

----

### Dump dicom file in JSON format

----
xnat.dicomDump(filename)
.then(function(jsonfile){
	console.log(jsonfile);
});
----


### Get XNAT projects

Get projects from xnat in json format

----
xnat.getProjects()
.then(function(projects){
	console.log(projects);
})
----

### Get XNAT subjects 

Optional parameters are projectid and subjectid.

----

xnat.getSubjects(projectid, subjectid)
.then(function(subjects){
	console.log(subjects);
});
----

Required parameters when using function getSubject

----
xnat.getSubject(projectid, subjectid)
.then(function(subject){
	console.log(subject);
});
----

### Get XNAT experiments

Get XNAT experiments, projectid is optional

----
xnat.getExperiments(projectid)
.then(function(experiments){
	console.log(experiments);
});
----

### Create subject

----
xnat.createSubject(projectid, subjectid)
.then(function(res){
	console.log(res);
})
----

### Upload dicom image

----
xnat.uploadImage(projectid, subjectid, sessionid, filename)
.then(function(res){
	console.log(res);
})
----

### Logout from xnat

----
xnat.logout()
.then(function(){
	console.log("logout");
})
----


