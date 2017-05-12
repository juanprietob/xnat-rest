const xnat = require("./index.js");
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const fs = require('fs');
const Promise = require('bluebird');
const path = require('path');
const Joi = require('joi');

xnat.setXnatUrl('http://localhost:8080');

xnat.useDCMExtensionOff();

var dicomdirectory = "./temp";
var projectid = "TestUMN1"

var user = {};

lab.experiment("Test xnat REST", function(){

    lab.test('returns true when user information is acquired', function(){
        return xnat.getUsernamePassword()
        .then(function(us){
            user = us;
        })
    })

	lab.test('returns true when user is logged in.', function(){

        return xnat.login(user)
        .then(function(res){
            console.log(res);
        });
        
	});

    lab.test('returns true when files are found in directory', function(){
        return xnat.findFiles(dicomdirectory)
        .then(function(files){

            Joi.assert(files, Joi.array.min(0))
            
        })
    });

	lab.test('returns true when dicomdump is executed.', function(){

        return Promise.map(files, function(file){

            return xnat.dicomDump(file)
            .then(function(dcmData){
                console.log("Importing file", file);
                var pid;

                if(patientid){
                    pid = patientid;
                }else{
                    pid = dcmData.dataset["00100020"].value;
                }

                var sessid;
                if(sessionid){
                    sessid = sessionid;
                }else{
                    sessid = dcmData.dataset["00080020"].value;
                }
                return xnat.uploadImage(projectid, pid, sessid, file);
            })
            .catch(function(err){
                            console.error(err);
                            console.error("No problem trying to continue...");
                    });
        }, {
            concurrency: 1
        });
        
	});

	lab.test('returns true when get projects.', function(){
        return xnat.getProjects()
        .then(function(res){
            console.log(JSON.stringify(res, null, 2));
        });
        
	});

	lab.test('returns true when get project subjects.', function(){
        return xnat.getSubjects(projectid)
        .then(function(res){
            console.log(JSON.stringify(res, null, 2));
        });
        
	});
	

	lab.test('returns true when get project experiments.', function(){
        return xnat.getExperiments("TestUMN1")
        .then(function(res){
            console.log(JSON.stringify(res, null, 2));
        });
        
	});	

	lab.test('returns true when get subject experiments.', function(){
        return xnat.getSubjectExperiments(projectid, "XNAT_S00001")
        .then(function(res){
            console.log(JSON.stringify(res, null, 2));
        });
        
	});

	lab.test('returns true when user is logged out.', function(){

        return xnat.logout(user)
        .then(function(res){
            console.log(res);            
        });
        
	});
});