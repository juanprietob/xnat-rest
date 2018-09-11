const request = require('request');
const Promise = require('bluebird');
const _ = require('underscore');
const path = require('path');
const fs = require('fs');
const dicomjs = require('dicomjs');
const qs = require('querystring');
const find = require('find');
const os = require('os');
const prompt = require('prompt');


class XnatLib {
    constructor(){
        this.configfilename = '.xnat.json';
        this.agentOptions = {
			rejectUnauthorized: false
		};
        this.useDCMExtension = true;
        this.jar = request.jar();
        this.url = "";
    }

	useDCMExtensionOn(){
		this.useDCMExtension = true;
	}

	useDCMExtensionOff(){
		this.setUseDCMExtension(false);
	}

	setUseDCMExtension(usedcm){
		this.useDCMExtension = usedcm;
	}

	setAgentOptions(agentOptions){
		this.agentOptions = agentOptions
	}

	setXnatUrl(url){
		this.url = url;
	}

	getXnatUrl(){
		return this.url;
	}

	login(user){
		var self = this;
		return new Promise(function(resolve, reject){
			var options = {
				url: self.getXnatUrl() + "/data/JSESSION",
				auth:user,
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{
					
					if(res.statusCode === 200){
						
						var cookie = request.cookie('JSESSIONID=' + body);
						self.jar.setCookie(cookie, self.getXnatUrl()); 

						resolve(body);
					}else{
						reject("Login failed. Please set server information again.");
					}
					
				}
			});
		})
	}

	dicomDump(filename){
		var self = this;
		return new Promise(function(resolve, reject){
			try{

				dicomjs.parseFile(filename, function (err, dcmData) {
				    if (!err) {
				        resolve(dcmData);
				    } else {
				        reject({
				        	err: err,
				        	filename: filename
				        });
				    }
				});
			}catch(err){
				reject({
		        	err: err,
		        	filename: filename
		        });
			}
		});	
	}

	getProjects(){
		var self = this;
		return new Promise(function(resolve, reject){
			var options = {
				url: self.getXnatUrl() + "/data/archive/projects" + "?format=json",
				jar: self.jar,
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){				
					reject(err);
				}else{				
					if(res.statusCode === 200){
						resolve(JSON.parse(body));
					}else{
						reject(body);
					}
				}
			});
		})	
	}

	getSubjects(projectid, subjectid){
		var self = this;
		return new Promise(function(resolve, reject){

			var params = {
				format: "json"
			}

			if(projectid){
				params.project = projectid;
			}

			if(subjectid){
				params.ID = subjectid;
			}

			var options = {
				url: self.getXnatUrl() + "/data/archive/subjects?" + qs.stringify(params),
				method: "GET",
				jar: self.jar,
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){				
					reject(err);
				}else{				
					if(res.statusCode === 200){					
						resolve(JSON.parse(body).ResultSet.Result);
					}else{
						reject(body);
					}
				}
			});
		});	
	}

	getExperiments(projectid){	
		var self = this;
		return new Promise(function(resolve, reject){

			var params = {
				format: "json"
			}

			if(projectid){
				params.project = projectid;
			}

			var options = {
				url: self.getXnatUrl() + "/data/archive/experiments?" + qs.stringify(params),
				method: "GET",
				jar: self.jar,
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){				
					reject(err);
				}else{				
					if(res.statusCode === 200){					
						resolve(JSON.parse(body).ResultSet.Result);
					}else{
						reject(body);
					}
				}
			});
		});
	}

	getSubject(projectid, subjectid){
		var self = this;
		return new Promise(function(resolve, reject){

			var params = {
				format: "json"
			};		

			var options = {
				url: self.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "?" + qs.stringify(params),
				jar: self.jar,
				agentOptions: self.agentOptions
			}
			
			request(options, function(err, res, body){
				if(err){				
					reject(err);
				}else{				
					if(res.statusCode === 200){										
						resolve(JSON.parse(body));
					}else{
						reject(body);
					}
				}
			});
		})	
	}

	setSubject(projectid, subjectid, params){
		var self = this;
		return new Promise(function(resolve, reject){
			if(_.isObject(params)){
				var options = {
					url: self.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "?" + qs.stringify(params),
					method: 'PUT',
					jar: self.jar,
					agentOptions: self.agentOptions
				}
				
				request(options, function(err, res, body){
					if(err){				
						reject(err);
					}else{				
						if(res.statusCode === 200){										
							resolve(body);
						}else{
							reject(body);
						}
					}
				});
			}else{
				reject("The parameters must be an object to set the subject's properties");
			}
		})	
	}

	setExperiment(projectid, subjectid, experimentid, params){
		var self = this;
		return new Promise(function(resolve, reject){
			if(_.isObject(params)){
				var options = {
					url: self.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid +"?" + qs.stringify(params),
					method: 'PUT',
					jar: self.jar,
					agentOptions: self.agentOptions
				}
				
				request(options, function(err, res, body){
					if(err){				
						reject(err);
					}else{				
						if(res.statusCode === 200){										
							resolve(body);
						}else{
							reject(body);
						}
					}
				});
			}else{
				reject("The parameters must be an object to set the subject's properties");
			}
		})	
	}

	getSubjectData(projectid, subjectid){
		var self = this;
		return new Promise(function(resolve, reject){

			var params = {			
				xsiType: "xnat:subjectData",
				format: "json"
			};		

			var options = {
				url: self.getXnatUrl() + "/data/projects/" + projectid + "/subjects/" + subjectid + "?" + qs.stringify(params),
				method: 'GET',
				jar: self.jar,
				agentOptions: self.agentOptions
			}
			
			request(options, function(err, res, body){
				if(err){				
					reject(err);
				}else{				
					if(res.statusCode === 200){										
						resolve(JSON.parse(body));
					}else{
						reject(body);
					}
				}
			});
		})	
	}

	getSubjectFiles(projectid, subjectid){
		var self = this;
		return new Promise(function(resolve, reject){

			var params = {
				format: "json"
			};		

			var options = {
				url: self.getXnatUrl() + "/data/projects/" + projectid + "/subjects/" + subjectid + "/files?" + qs.stringify(params),
				method: 'GET',
				jar: self.jar,
				agentOptions: self.agentOptions
			}
			
			request(options, function(err, res, body){
				if(err){				
					reject(err);
				}else{				
					if(res.statusCode === 200){										
						resolve(JSON.parse(body));
					}else{
						reject(body);
					}
				}
			});
		})
	}

	getSubjectExperiments(projectid, subjectid){
		var self = this;
		return new Promise(function(resolve, reject){

			var params = {
				format: "json"
			}

			var options = {
				url: self.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments?" + qs.stringify(params),
				jar: self.jar,
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){				
					reject(err);
				}else{				
					if(res.statusCode === 200){
						resolve(JSON.parse(body));
					}else{
						reject(body);
					}
				}
			});
		})	
	}

	getSubjectExperiment(projectid, subjectid, experimentid){
		var self = this;
		return self.getSubjectSession(projectid, subjectid, experimentid);
	}

	getSubjectSession(projectid, subjectid, sessionid){
		var self = this;
		return new Promise(function(resolve, reject){

			var params = {
				format: "json"
			}

			var url;
			if(sessionid){
				url = "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + sessionid + "?" + qs.stringify(params);
			}else{
				url = "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments?" + qs.stringify(params);
			}

			var options = {
				url: self.getXnatUrl() + url,
				jar: self.jar,
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){				
					reject(err);
				}else{				
					if(res.statusCode === 200){
						resolve(JSON.parse(body));
					}else{
						reject(body);
					}
				}
			});
		})	
	}

	createSubject(projectid, subjectid) {
		var self = this;
		return new Promise(function(resolve, reject){
			var options = {
				url: self.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid,
				method: "PUT",
				jar: self.jar,
				agentOptions: self.agentOptions
			}		
			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{
					if(res.statusCode === 200 || res.statusCode === 201){
						resolve(body);
					}else{
						reject(body);
					}
				}
			});
		});
	}

	uploadImage(projectid, subjectid, experimentid, filename){
		var self = this;
		return new Promise(function(resolve, reject){		

			var params = {
				inbody: true,
				overwrite: "delete",
				dest: "/archive/projects/" + projectid,
				"import-handler" : "gradual-DICOM",
				SUBJECT_ID: subjectid,
				EXPT_LABEL: experimentid
			}

			var options = {
				url: self.getXnatUrl() + "/data/services/import?" + qs.stringify(params),
				method: "POST",
				jar: self.jar,
				body: fs.readFileSync(filename),
				agentOptions: self.agentOptions
			}		

			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{				
					if(res.statusCode === 200){					
						resolve(body);
					}else{
						reject(body);
					}
				}
			});
		});
	}

	getFileStream(uri){
		var self = this;
		return new Promise(function(resolve, reject){
			var options = {
				url: self.getXnatUrl() + uri,
				method: "GET",
				jar: self.jar,
				agentOptions: self.agentOptions
			}		

			var req = request(options);

			resolve(req)
		})
	}

	uploadImageStream(projectid, subjectid, experimentid, filestream){
		var self = this;
		return new Promise(function(resolve, reject){		

			var params = {
				inbody: true,
				overwrite: "delete",
				dest: "/archive/projects/" + projectid,
				"import-handler" : "gradual-DICOM",
				SUBJECT_ID: subjectid,
				EXPT_LABEL: experimentid
			}

			var options = {
				url: self.getXnatUrl() + "/data/services/import?" + qs.stringify(params),
				method: "POST",
				jar: self.jar,
				agentOptions: self.agentOptions,
				body: filestream
			}	

			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{				
					if(res.statusCode === 200){					
						resolve(body);
					}else{
						reject(body);
					}
				}
			});
		})
	}

	uploadConvertedImage(projectid, subjectid, experimentid, scanid, filename){
		var self = this;
		return new Promise(function(resolve, reject){

			var params = {
				inbody: true
			}

			var options = {
				url: self.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid + "/scans/" + scanid + "/files/" + path.basename(filename) + "?" + qs.stringify(params),
				method: "PUT",
				jar: self.jar,
				body: fs.readFileSync(filename),
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{				
					if(res.statusCode === 200){
						console.log("File imported");
						resolve(body);
					}else{
						reject(body);
					}
				}
			});
		})	
	}

	uploadConvertedImageStream(projectid, subjectid, experimentid, scanid, filename, filestream){
		var self = this;
		return new Promise(function(resolve, reject){

			var params = {
				inbody: true
			}

			var options = {
				url: self.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid + "/scans/" + scanid + "/files/" + path.basename(filename) + "?" + qs.stringify(params),
				method: "PUT",
				jar: self.jar,
				body: filestream,
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{				
					if(res.statusCode === 200){
						console.log("File imported");
						resolve(body);
					}else{
						reject(body);
					}
				}
			});
		})	
	}

	copyResource(projectid, source_subjectid, source_experimentid, source_scanid, source_resourceid, source_filename, dest_subjectid, dest_experimentid, dest_scanid, dest_resourceid, dest_filename){
		var self = this;
		return new Promise(function(resolve, reject){

			var params = {
				overwrite: "append"
			}
			
			var source_options = {
				url: self.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + source_subjectid + "/experiments/" + source_experimentid + "/scans/" + source_scanid + "/resources/" + source_resourceid + "/files/" + source_filename,
				method: "GET",
				jar: self.jar,
				agentOptions: self.agentOptions
			}

			var dest_options = {
				url: self.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + dest_subjectid + "/experiments/" + dest_experimentid + "/scans/" + dest_scanid + "/resources/" + dest_resourceid + "/files/" + dest_filename + "?" + qs.stringify(params),
				method: "PUT",
				jar: self.jar,
				agentOptions: self.agentOptions
			}

			var source_req = request(source_options)
			.pipe(request(dest_options, function(err, res, body){
				if(err){
					reject(err);
				}else{				
					if(res.statusCode === 200){
						console.log("File copied");
						resolve(body);
					}else{
						reject(body);
					}
				}
			}));

			source_req.on('response', function (res) {
				if(res.statusCode === 400){
					reject("File not found:" + source_options.url);
				}
			});
		})	
	}

	moveResource(projectid, source_subjectid, source_experimentid, source_scanid, source_resourceid, source_filename, dest_subjectid, dest_experimentid, dest_scanid, dest_resourceid, dest_filename){
		var self = this;
		return self.copyResource(projectid, source_subjectid, source_experimentid, source_scanid, source_resourceid, source_filename, dest_subjectid, dest_experimentid, dest_scanid, dest_resourceid, dest_filename)
		.then(function(){
			return self.deleteResourceFile(projectid, source_subjectid, source_experimentid, source_scanid, source_resourceid, source_filename);
		})
	}

	deleteResourceFile(projectid, subjectid, experimentid, scanid, resourceid, filename){
		var self = this;
		return new Promise(function(resolve, reject){
			var options = {
				url: self.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid + "/scans/" + scanid + "/resources/" + resourceid + "/files/" + filename,
				method: "DELETE",
				jar: self.jar,
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{				
					if(res.statusCode === 200){
						console.log("File deleted");
						resolve(body);
					}else{
						reject(body);
					}
				}
			});
		});
	}

	createResources(projectid, subjectid, experimentid, scanid, resourceName){
		var self = this;
		return new Promise(function(resolve, reject){

			var options = {
				url: self.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid + "/scans/" + scanid + "/resources/" + resourceName,
				method: "PUT",
				jar: self.jar,
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{				
					if(res.statusCode === 200){
						resolve(body);
					}else{
						reject(body);
					}
				}
			});
		})	
		
	}

	getResourceFiles(projectid, subjectid, experimentid, scanid, resource){
		var self = this;
		return new Promise(function(resolve, reject){

			var params = {
				format: "json"
			}

			var options = {
				url: self.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid + "/scans/" + scanid + "/resources/" + resource + "/files?" + qs.stringify(params),
				method: "GET",
				jar: self.jar,
				agentOptions: self.agentOptions,
				headers: {
					'content-type': 'application/json'
				}
			}

			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{				
					if(res.statusCode === 200){
						if(_.isObject(body)){
							resolve(body);
						}else{
							resolve(JSON.parse(body));
						}
					}else{
						reject(body);
					}
				}
			});
		})	
		
	}

	getResources(projectid, subjectid, experimentid, scanid){
		var self = this;
		return new Promise(function(resolve, reject){

			var params = {
				format: "json"
			}

			var options = {
				url: self.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid + "/scans/" + scanid + "/resources?" + qs.stringify(params),
				method: "GET",
				jar: self.jar,
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{				
					if(res.statusCode === 200){
						if(_.isObject(body)){
							resolve(body);
						}else{
							resolve(JSON.parse(body));
						}
					}else{
						reject(body);
					}
				}
			});
		})	
		
	}

	uploadResourceFile(projectid, subjectid, experimentid, scanid, resourceid, filename){
		var self = this;
		return new Promise(function(resolve, reject){

			var params = {
				inbody: true
			}

			var options = {
				url: self.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid + "/scans/" + scanid + "/resources/" + resourceid + "/files/" + path.basename(filename) + "?" + qs.stringify(params),
				method: "PUT",
				jar: self.jar,
				body: fs.readFileSync(filename),
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{				
					if(res.statusCode === 200){
						console.log("File imported");
						resolve(body);
					}else{
						reject(body);
					}
				}
			});
		});	
	}

	search(id){
		var self = this;
		return new Promise(function(resolve, reject){

			var params = {
				format: "json",
				ID: id
			}

			var options = {
				url: self.getXnatUrl() + "/data/search/elements/xnat:subjectData?" + qs.stringify(params),
				method: "GET",
				jar: self.jar,
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{				
					if(res.statusCode === 200){
						resolve(body);
					}else{
						reject(body);
					}
				}
			});
		})	
	}

	deleteConvertedImage(projectid, subjectid, experimentid, scanid, filename){
		var self = this;
		return new Promise(function(resolve, reject){

			var options = {
				url: self.getXnatUrl() + "/data/experiments/" + experimentid + "/scans/" + scanid + "/resources",
				method: "GET",
				jar: self.jar,
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{				
					if(res.statusCode === 200){

						var resultset = JSON.parse(body);
						var resultsetcontent = _.find(resultset.ResultSet.Result, function(result){
							return result.content == "RAW";
						});

						if(resultsetcontent && resultsetcontent.xnat_abstractresource_id){
							var options = {
								url: self.getXnatUrl() + "/data/experiments/" + experimentid + "/scans/" + scanid + "/resources/" + resultsetcontent.xnat_abstractresource_id + "/files/" + path.basename(filename),
								method: "DELETE",
								jar: self.jar,
								agentOptions: self.agentOptions
							}

							request(options, function(err, res, body){
								if(err){
									reject(err);
								}else{				
									if(res.statusCode === 200){
										console.log("File deleted");
										resolve(body);
									}else{
										reject(body);
									}
								}
							});
						}else{
							reject("No RAW content found in session", "/data/experiments/" + experimentid + "/scans/" + scanid + "/resources");
						}

						
					}else{
						reject(body);
					}
				}
			});

			
		})	
	}

	getScanFiles(projectid, subjectid, experimentid, scanid){
		var self = this;
		return new Promise(function(resolve, reject){

			var params = {
				format: "json"
			}

			var options = {
				url: self.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid + "/scans/" + scanid + "/files?" + qs.stringify(params),
				method: "GET",
				jar: self.jar,
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{				
					try{
						if(res.statusCode === 200){
							var images = JSON.parse(body);
							resolve(images.ResultSet.Result);
						}else{
							reject(body);
						}
					}catch(e){
						console.error("self.getScanFiles", e);
						reject(e);
					}
					
				}
			});
		});	
	}

	getScans(projectid, subjectid, experimentid){
		var self = this;
		return new Promise(function(resolve, reject){

			var params = {
				format: "json"
			}

			var options = {
				url: self.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid + "/scans/?" + qs.stringify(params),
				method: "GET",
				jar: self.jar,
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{				
					try{
						if(res.statusCode === 200){
							var images = JSON.parse(body);
							resolve(images.ResultSet.Result);
						}else{
							reject(body);
						}
					}catch(e){
						console.error("getScans", e);
						reject(e);
					}
					
				}
			});
		});	
	}

	getScan(projectid, subjectid, experimentid, scanid){
		var self = this;
		return new Promise(function(resolve, reject){

			var params = {
				format: "json"
			}

			var options = {
				url: self.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid + "/scans/" + scanid + "?" + qs.stringify(params),
				method: "GET",
				jar: self.jar,
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{				
					try{
						if(res.statusCode === 200){
							resolve(JSON.parse(body));
						}else{
							reject(body);
						}
					}catch(e){
						console.error("getScan", e);
						reject(e);
					}
					
				}
			});
		});	
	}

	getScanData(projectid, subjectid, experimentid, scanid){
		var self = this;
		return new Promise(function(resolve, reject){

			var params = {
				xsyType:"xnat:mrScanData",
				format: "JSON"
			}

			var options = {
				url: self.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid + "/scans/" + scanid + "?" + qs.stringify(params),
				method: "GET",
				jar: self.jar,
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{				
					try{
						if(res.statusCode === 200){
							resolve(JSON.parse(body));
						}else{
							reject(body);
						}
					}catch(e){
						console.error("getScan", e);
						reject(e);
					}
					
				}
			});
		});	
	}

	setScanData(projectid, subjectid, experimentid, scanid, data){
		var self = this;
		return new Promise(function(resolve, reject){

			var options = {
				url: self.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid + "/scans/" + scanid,
				method: "PUT",
				jar: self.jar, 
				qs: data,
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{				
					try{
						if(res.statusCode === 200){
							resolve(body);
						}else{
							reject(body);
						}
					}catch(e){
						console.error("getScan", e);
						reject(e);
					}
					
				}
			});
		});	
	}

	deleteFile(uri){
		var self = this;
		return new Promise(function(resolve, reject){

			var options = {
				url: self.getXnatUrl() + uri,
				method: "DELETE",
				jar: self.jar,
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{				
					try{
						if(res.statusCode === 200){
							console.log("File deleted")
							resolve(body);
						}else{
							reject(body);
						}
					}catch(e){
						console.error("getScanFiles", e);
						reject(e);
					}
					
				}
			});
		});
	}

	triggerPipelines(projectid, subjectid, experimentid){
		var self = this;
		return new Promise(function(resolve, reject){		

			var params = {			
				triggerPipelines: true
			}

			var options = {
				url: self.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid + "?" + qs.stringify(params),
				method: "PUT",
				jar: self.jar,
				agentOptions: self.agentOptions
			}

			console.log(options);

			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{				
					if(res.statusCode === 200){					
						resolve(body);
					}else{
						reject(body);
					}
				}
			});
		})	
	}

	logout(){
		var self = this;
		if(self.jar){
			return new Promise(function(resolve, reject){
				var options = {
					url: self.getXnatUrl() + "/data/JSESSION",
					method: "DELETE",
					jar: self.jar,
					agentOptions: self.agentOptions
				}

				request(options, function(err, res, body){
					if(err){				
						reject(err);
					}else{				
						if(res.statusCode === 200){
							resolve(true);
						}else{
							reject(body);
						}
					}
				});
			});
		}else{
			return Promise.resolve(true);
		}
		
	}

	findFiles(directory){
		var self = this;
		return new Promise(function(resolve, reject){
			if(self.useDCMExtension){
				console.log("Searching DICOM files with .dcm extension");
				var files = find.file(/\.dcm$/, directory, function(files){
					resolve(files)
				})
				.error(function(err){
					reject(err);
				});
			}else{
				console.log("Searching DICOM files");
				var files = find.file(directory, function(files){
					resolve(files)
				})
				.error(function(err){
					reject(err);
				});
			}
			
		})
	}

	promptUsernamePassword(){
		var self = this;
	    return new Promise(function(resolve, reject){
	        var schema = {
	            properties: {
	                user: {
	                    message: 'Username',
	                    required: true
	                },
	                password: {                    
	                    hidden: true,
	                    required: true
	                }
	            }
	        };
	        prompt.start();
	        prompt.get(schema, function (err, result) {
	        	if(err){
	        		reject(err);
	        	}else{
	        		resolve(result);
	        	}
	        });
	    });
	}

	promptXnatUrl(){
		var self = this;
		return new Promise(function(resolve, reject){
	        var schema = {
	            properties: {
	                server: {
	                    message: 'Xnat url',
	                    required: true
	                }
	            }
	        };
	        prompt.start();
	        prompt.get(schema, function (err, result) {
	        	if(err){
	        		reject(err);
	        	}else{
	        		resolve(result);
	        	}
	        });
	    });
	}

	writeConfFile(conf){
	    var confpath = path.join(os.homedir(), this.configfilename);
	    console.log("Writting configuration file with to:", confpath);
	    console.log("You won't need to type the server information next time.");
	    console.log("If you have authentication problems in the future or change password, please type the server url again. You will be prompted to write your username and password again.");

	    fs.writeFileSync(confpath, JSON.stringify(conf));
	}

	setScanQualityLabels(projectid, labelfilename){
		var self = this;
		return new Promise(function(resolve, reject){

			var params = {
				inbody: true
			}
			var options = {
				url: self.getXnatUrl() + "/REST/projects/" + projectid + "/config/scan-quality/labels?" + qs.stringify(params),
				method: "PUT",
				jar: self.jar,
				data: fs.readFileSync(labelfilename),
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{
					if(res.statusCode === 200){					
						resolve(body);
					}else{
						reject(body);
					}
				}
			});
		});
	}

	getWorkflow(workflowid){
		var self = this;
		return new Promise(function(resolve, reject){
			var params = {
				format: "json"
			}

			var options = {
				url: self.getXnatUrl() + "/data/workflows/" + workflowid + "?" + qs.stringify(params),
				method: "GET",
				jar: self.jar,
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{				
					try{
						if(res.statusCode === 200){
							resolve(JSON.parse(body));
						}else{
							reject(body);
						}
					}catch(e){
						console.error("getWorkflow", e);
						reject(e);
					}
					
				}
			});
		});
	}

	changeWorkflowStatus(workflowid, status){
		var self = this;
		return new Promise(function(resolve, reject){
			var params = {
				"wrk:workflowData/status": status, 
				format: "json"
			}

			var options = {
				url: self.getXnatUrl() + "/data/workflows/" + workflowid + "?" + qs.stringify(params),
				method: "PUT",
				jar: self.jar,
				agentOptions: self.agentOptions
			}

			request(options, function(err, res, body){
				if(err){
					reject(err);
				}else{				
					try{
						if(res.statusCode === 200){
							if(body){
								resolve(JSON.parse(body));
							}else{
								resolve({
									statusCode: 200
								});
							}
							
						}else{
							reject(body);
						}
					}catch(e){
						console.error("getWorkflow", e);
						reject(e);
					}
					
				}
			});
		});
	}


	upload(){
		require(path.join(__dirname, 'upload'))(this);
	}

	importConverted(){
		require(path.join(__dirname, 'importConverted'))(this);
	}

	deleteConverted(){
		require(path.join(__dirname, 'deleteConverted'))(this);
	}

	changeSubjectLabel(){
		require(path.join(__dirname, 'changeSubjectLabel'))(this);
	}

	sync_xnat(){
		require(path.join(__dirname, 'sync'))(this);
	}

	getConfigFile() {
		var self = this;
	    return new Promise(function(resolve, reject){
	        try {
	            // Try to load the user's personal configuration file
	            var conf = path.join(os.homedir(), self.configfilename);
	            resolve(require(conf));
	        } catch (e) {            
	            reject(e);
	        }
	    });
	}

	setXnatUrlAndLogin(server, promptlogin){
		var self = this;

		var loginprom = undefined;
		if(server){

		    var conf = {};
		    conf.server = server;

		    loginprom = self.promptUsernamePassword()
		    .then(function(user){
		    	conf.user = user;
		        self.writeConfFile(conf);
		        return conf;
		    });
		}else{
		    loginprom = self.getConfigFile()
		    .catch(function(err){
		    	return self.promptXnatUrl()
		    	.then(function(conf){
		    		if(!promptlogin){
		    			return self.promptUsernamePassword()
		    			.then(function(user){
					    	conf.user = user;
					        self.writeConfFile(conf);
					        return conf;
					    });
		    		}else{
		    			return conf;
		    		}
		    	});
		    })
		    .then(function(conf){
		    	if(promptlogin){
		    		return self.promptUsernamePassword()
				    .then(function(user){
				    	conf.user = user;
				        self.writeConfFile(conf);
				        return conf;
				    });
		    	}else{
		    		return conf;
		    	}
		    })
		    .catch(function(e){
		        throw "Config file not found. Use -h or --help to learn how to use this program";
		    });
		}

		return loginprom
		.then(function(conf){
			console.log("Setting server url to ", conf.server);
			self.setXnatUrl(conf.server);
			console.log("Login to xnat.", conf.server);
			return self.login(conf.user);
		});
		
	}

	start(codename){
		var self = this;
		if(codename){
			return self.getConfigFile()
			.then(function(conf){
				if(!conf[codename]){
					return self.promptXnatUrl()
					.then(function(sync_conf){
						return self.promptUsernamePassword()
						.then(function(user){
							sync_conf.user = user;
							return sync_conf;
						});
					})
					.then(function(sync_conf){
						conf[codename] = sync_conf;
						self.writeConfFile(conf);
						return conf[codename];
					})
				}else{
					return conf[codename];
				}
			})
			.then(function(sync_config){
				console.log("Setting sync server url to ", sync_config.server);
				self.setXnatUrl(sync_config.server);
				console.log("Login to", sync_config.server);
				return self.login(sync_config.user);
			});
		}else{
			return self.setXnatUrlAndLogin(codename);
		}
		
	}

}

module.exports = new XnatLib();
