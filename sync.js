
module.exports = function(xnat){
	
	const fs = require('fs');
	const Promise = require('bluebird');
	const path = require('path');
	const argv = require('minimist')(process.argv.slice(2));
	const _ = require('underscore');
	const os = require('os');
	const xnat_target = new xnat.constructor();
	const csvtojson = require("csvtojson");


	const help = function(){
		console.log("Sync a local xnat to a remote one. The local patient id (patient label) and session id (session label) will be used in the remote xnat instance");
		console.log("Usage: node", process.argv[1],"-csv <filename>");
		console.log("Options:");
		console.log("-p <project id>, project id in local XNAT");
		console.log("--pid <patient id>");
		console.log("--sid <session id>");
		console.log("--tp <target project id>");
		console.log("--sync_dicom <Sync dicom resource 1 or 0, default 1>");
		console.log("--sync_qc <Sync quality control 1 or 0, default 1>");
		console.log("--sync_resources <Sync the following resources, use many '--sync_resources' flag if there is more than one resource to sync>");
	}


	if(!argv["p"] || !argv["pid"] || !argv["sid"] || argv["h"] || argv["help"]){
		help();
		process.exit(1);
	}

	var csvfilename = argv["csv"];
	var projectid = argv["p"];
	var target_projectid = argv["tp"];
	var subjectid = argv["pid"];
	var sessionid = argv["sid"];
	var sync_resources = _.compact(_.isArray(argv["sync_resources"])? argv["sync_resources"] : [argv["sync_resources"]]);
	var sync_dicom_resource = argv["sync_dicom"] == undefined? 1 : argv["sync_dicom"];
	var sync_qc = argv["sync_qc"] == undefined? 1 : argv["sync_qc"];

	const readCSV = function(filename){
	    var self = this;
	    return new Promise(function(resolve, reject){
	        var objarr = [];
	        csvtojson()
	        .fromFile(filename)
	        .on('json', function(jsonObj){
	            objarr.push(jsonObj);
	        })
	        .on('end', function(){
	            resolve(objarr);
	        })
	        .on('error', function(err){
	            reject(err);
	        })
	    });
	}

	const testSubjectSessionRec = function(projectid, pid, expid, repeat){
		return xnat_target.getSubjectSession(projectid, pid)
		.then(function(sessions){
			if(sessions.ResultSet && sessions.ResultSet.Result){
				var allsessions = sessions.ResultSet.Result;
				var session = _.find(allsessions, function(sess){
					return sess.label == expid;
				});

				if(session){
					return Promise.resolve();
				}else{
					var wait;
					if(repeat > 0){
						console.log("Waiting:", repeat,  "minute(s) left, the session is not there yet");
						wait = Promise.delay(60000)
						.then(function(){
							repeat--;
							return testSubjectSessionRec(projectid, pid, expid, repeat);
						});
					}else{
						wait = Promise.resolve();
					}
					return wait;
				}
			}
			return Promise.reject("Subject exists but session not found.");
		})
		.catch(function(e){
			var wait;
			if(repeat > 0){
				console.error(e);
				console.log("Waiting:", repeat,  "minute(s) left, the session is not there yet");
				wait = Promise.delay(60000)
				.then(function(){
					repeat--;
					return testSubjectSessionRec(projectid, pid, expid, repeat);
				});
			}else{
				wait = Promise.resolve();
			}
			return wait;
		});

	}

	const waitDicomSession = function(projectid, pid, expid, repeat){
		return testSubjectSessionRec(projectid, pid, expid, repeat);
	}

	xnat.start()
	.then(function(){
		return xnat_target.start('intradb');
	})
	.then(function(){
		return xnat.getSubjectExperiment(projectid, subjectid, sessionid);
	})
	.then(function(res){
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

		var sync_dicom_resource_promise = Promise.resolve();

		if(sync_dicom_resource){
			console.log("Syncing dicom images now...");
			sync_dicom_resource_promise = Promise.map(scan_items_data_fields, function(data_fields){
				return xnat.getScanFiles(projectid, subjectid, sessionid, data_fields.ID)
				.then(function(files){
					return _.filter(files, function(file){
						return file.collection && file.collection == "DICOM";
					})
				})
				.then(function(res){
					return _.flatten(res);
				})
				.then(function(scan_files){
					return Promise.map(scan_files, function(files){
						return xnat.getFileStream(files.URI)
						.then(function(fstream){
							// return new Promise(function(resolve, reject){
								
							// 	var wstream = fs.createWriteStream(path.join("/work/jprieto/source/xnat-rest/temp_out", files.Name));
							// 	fstream.pipe(wstream);

							// 	wstream.on('finish', function(err){                 
				   //                  if(err){
				   //                      reject(files);
				   //                  }else{
				   //                      resolve();
				   //                  }
				   //              });
							// });
							return xnat_target.uploadImageStream(target_projectid, subjectid, sessionid, fstream);
						});
					}, {concurrency: 1});
					
				});
			}, {concurrency: 1})
			.catch(function(e){
				console.error(e);
				return Promise.resolve();
			});
		}

		return sync_dicom_resource_promise
		.then(function(){
			return waitDicomSession(target_projectid, subjectid, sessionid, 30);
		})
		.then(function(){
			var sync_qc_promise = Promise.resolve();
			if(sync_qc){
				console.log("Syncing quality control now...");
				sync_qc_promise = Promise.map(scan_items_data_fields, function(data_fields){
					return xnat.getScanData(projectid, subjectid, sessionid, data_fields.ID)
					.then(function(scan_data){
						if(scan_data.items && scan_data.items[0] && scan_data.items[0].data_fields){

							var quality = scan_data.items[0].data_fields["quality"]? scan_data.items[0].data_fields["quality"]: " ";
							var note =  scan_data.items[0].data_fields["note"]? scan_data.items[0].data_fields["note"] : " ";

							return xnat_target.setScanData(target_projectid, subjectid, sessionid, data_fields.ID, {
								"xsiType": "xnat:mrScanData",
								"xnat:mrScanData/quality": quality,
								"xnat:mrScanData/note": note
							});
						}
						return Promise.resolve();
					});
				}, {concurrency: 1})
				.catch(function(e){
					console.error(e);
					return Promise.resolve();
				});
			}

			return sync_qc_promise;
		})
		.then(function(){
			return Promise.map(sync_resources, function(resource){
				console.log("Syncing resource", resource);
				return Promise.map(scan_items_data_fields, function(data_fields){
					return xnat.getScanFiles(projectid, subjectid, sessionid, data_fields.ID)
					.then(function(files){
						return _.filter(files, function(file){
							return file.collection && file.collection == resource;
						})
					})
					.then(function(res){
						return _.flatten(res);
					})
					.then(function(scan_files){
						if(scan_files.length > 0){
							return xnat_target.createResources(target_projectid, subjectid, sessionid, data_fields.ID, resource)
							.catch(function(err){
								console.error(err);
								return Promise.resolve();
							})
							.then(function(){
								return Promise.map(scan_files, function(files){
									return xnat.getFileStream(files.URI)
									.then(function(fstream){
										console.log(data_fields.ID, files.URI)
										return xnat_target.uploadConvertedImageStream(target_projectid, subjectid, sessionid, data_fields.ID, files.URI, fstream);
									});
								}, {concurrency: 1});
							})
							.catch(function(err){
								console.error(err);
								return Promise.resolve();
							})
						}else{
							return Promise.resolve();
						}
					});
				}, {concurrency: 1});
			});
		});
	})
	.then(function(){
		return Promise.all([xnat.logout(), xnat_target.logout()]);
	})
	.catch(function(e){
		console.error(e);
		return Promise.all([xnat.logout(), xnat_target.logout()]);
	})
}