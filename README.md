# xnat-rest

Use xnat-rest API with this package. 

----
	npm install xnat-rest
----

To test this package please download some DICOM files to your directory and modify the test.js script with the folder name.
This package was tested with data available at [archive.org](https://archive.org/download/9889023420030505CT/98890234_20030505_CT.tar.bz2)

Run all tests with

----
	npm test
----


## Usage: 

To write your own application and query XNAT Rest API

```javascript

	var xnat = require('xnat-rest');
	

	xnat.start()
	.then(function(){
		//Do operations with XNAT REST points
	})
	.catch(function(err){
		console.error("Login failed")
	});

```

The following operations are supported by this library

```javascript
	
	xnat.useDCMExtensionOn()
	
	xnat.useDCMExtensionOff()
	
	xnat.setUseDCMExtension(bool);
	
	xnat.setAgentOptions(agentOptions);//Object to pass to the request library documentation is here https://github.com/request/request
	
	xnat.setXnatUrl(url);//url = http://localhost:8080/xnat for example
	
	xnat.getXnatUrl();
	
	xnat.login(user);//Object with {"user":"username","password":"yourpass"} given to the request lib documentation also in the 'auth' section https://github.com/request/request
	
	xnat.dicomDump(filename);
	
	xnat.getProjects();
	
	xnat.getSubjects(projectid, subjectid);
	
	xnat.getExperiments(projectid);
	
	xnat.getSubject(projectid, subjectid);
	
	xnat.setSubject(projectid, subjectid, params);
	
	xnat.setExperiment(projectid, subjectid, experimentid, params);
	
	xnat.getSubjectData(projectid, subjectid);
	
	xnat.getSubjectFiles(projectid, subjectid);
	
	xnat.getSubjectExperiments(projectid, subjectid);
	
	xnat.getSubjectExperiment(projectid, subjectid, experimentid);
	
	xnat.getSubjectSession(projectid, subjectid, sessionid);
	
	xnat.createSubject(projectid, subjectid);
	
	xnat.uploadImage(projectid, subjectid, experimentid, filename);
	
	xnat.uploadConvertedImage(projectid, subjectid, experimentid, scanid, filename);
	
	xnat.copyResource(projectid, source_subjectid, source_experimentid, source_scanid, source_resourceid, source_filename, dest_subjectid, dest_experimentid, dest_scanid, dest_resourceid, dest_filename);

	xnat.moveResource(projectid, source_subjectid, source_experimentid, source_scanid, source_resourceid, source_filename, dest_subjectid, dest_experimentid, dest_scanid, dest_resourceid, dest_filename);

	xnat.deleteResourceFile(projectid, subjectid, experimentid, scanid, resourceid, filename);

	xnat.createResources(projectid, subjectid, experimentid, scanid, resourceName);

	xnat.getResourceFiles(projectid, subjectid, experimentid, scanid, resource);

	xnat.getResources(projectid, subjectid, experimentid, scanid);

	xnat.uploadResourceFile(projectid, subjectid, experimentid, scanid, resourceid, filename);

	xnat.search(id);

	xnat.deleteConvertedImage(projectid, subjectid, experimentid, scanid, filename);

	xnat.getScanFiles(projectid, subjectid, experimentid, scanid);

	xnat.getScans(projectid, subjectid, experimentid);

	xnat.deleteFile(uri);

	xnat.triggerPipelines(projectid, subjectid, experimentid);

	xnat.prearchive();

	xnat.logout();

	xnat.findFiles(directory);

	xnat.promptUsernamePassword();

	xnat.promptXnatUrl();

	xnat.writeConfFile(conf);

	xnat.setScanQualityLabels(projectid, labelfilename);

	xnat.upload();

	xnat.importConverted();

	xnat.deleteConverted();

	xnat.changeSubjectLabel();

	xnat.setXnatUrlAndLogin(server, promptlogin);

```


To upload files using this library create a file (index.js) and add:

```javascript
	var xnat = require('xnat-rest');

	xnat.upload();
```

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

### Usage simplified:

The function 'xnat.start()' will prompt for the xnat url, e.x., 'http://yourserver.com/xnat', then for username and password 
You can then query and do operations on your xnat instance after that.

```javascript
	const Promise = require('bluebird');
	const _ = require('underscore');
	const xnat = require('xnat-rest');

	var projectid = "YourProjectId";
	var subjectid = "SomeSubjectId";
	var sessionid = "SomeSessionId";

	xnat.start()
	.then(function(){
		return xnat.getSubjectExperiment(projectid, subjectid, sessionid);
	})
	.then(function(result){
		console.log(result);
	});
```

### Get all images from a given session

```javascript
	const xnat = require('xnat-rest');
	const _ =  require('underscore');
	const Promise = require('bluebird');

	var projectid = "YourProjectId";
	var subjectid = "SomeSubjectId";
	var sessionid = "SomeSessionId";

	xnat.getSubjectExperiment(projectid, subjectid, sessionid)
	.then(function(res){
		//This will give you the id of the acquired images in that session
		var scan = [];
		_.each(res.items, function(item){
			_.each(item.children, function(children){
				_.each(children.items, function(items){
					scan.push(items.data_fields);
				});
			});
		});
		return scan;
	})
	.then(function(scan_items_data_fields){
		//This gives you ALL the available images for a given session
		// /data/archive/projects/{ID}/subjects/{ID | label}/experiments/{ID | label}/scans/{ID}/files

        return Promise.map(scan_items_data_fields, function(data_fields){
            return xnat.getScanFiles(projectid, subjectid, sessionid, data_fields.ID);
        })
        .then(function(res){
             //to have a flat array with all the available files
             return _.flatten(res);
        });
	})
	.then(function(scan_files){
		return Promise.map(scan_files, function(files){
			return xnat.getFileStream(files.URI)
			.then(function(fstream){
	             // Do something with stream, pipe, write etc..
	        });
	});
```

### Upload a dicom directory to xnat

Create a script with the following code

```javascript
	const xnat = require('xnat-rest');
	xnat.upload();
```

Call your script 

```bash
	node yourscript.js -d /path/to/dicom/directory -p ProjectIdInXNAT
```

### User login to xnat instance:

```javascript

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

```

### Dump dicom file in JSON format

```javascript
	xnat.dicomDump(filename)
	.then(function(jsonfile){
		console.log(jsonfile);
	});
```


### Get XNAT projects

Get projects from xnat in json format

```javascript
	xnat.getProjects()
	.then(function(projects){
		console.log(projects);
	})
```

### Get XNAT subjects 

Optional parameters are projectid and subjectid.

```javascript

	xnat.getSubjects(projectid, subjectid)
	.then(function(subjects){
		console.log(subjects);
	});

```

Required parameters when using function getSubject

```javascript
	xnat.getSubject(projectid, subjectid)
	.then(function(subject){
		console.log(subject);
	});
```

### Get XNAT experiments

Get XNAT experiments, projectid is optional

```javascript
	xnat.getExperiments(projectid)
	.then(function(experiments){
		console.log(experiments);
	});
```

### Create subject

```javascript
	xnat.createSubject(projectid, subjectid)
	.then(function(res){
		console.log(res);
	})
```

### Upload dicom image

```javascript
	xnat.uploadImage(projectid, subjectid, sessionid, filename)
	.then(function(res){
		console.log(res);
	})
```

### Logout from xnat

```javascript
	xnat.logout()
	.then(function(){
		console.log("logout");
	})
```


