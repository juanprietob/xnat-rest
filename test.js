const xnat = require("./index.js");
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const fs = require('fs');
const Promise = require('bluebird');
const path = require('path');

var user = {
    user: "jprieto",
    password: "2006BuitragoK-9!"
}

xnat.setXnatUrl('http://152.19.32.248:8080');

lab.experiment("Test xnat REST", function(){
	lab.test('returns true when user is logged in.', function(){

        return xnat.login(user)
        .then(function(res){

        });
        
	});

	lab.test('returns true when dicomdump is executed.', function(){

        return xnat.dicomDump("/NIRAL/work/jprieto/source/xnat-rest/temp/116845_06_DWI/MR-SE009-DWI_dir79_AP/MR-ST001-SE009-0001.dcm")
        .then(function(res){        	
        	console.log(res.dataset['00100020'].value);
        });
        
	});

	lab.test('returns true when get projects.', function(){
        return xnat.getProjects()
        .then(function(res){
            console.log(JSON.stringify(res, null, 2));
        });
        
	});

	lab.test('returns true when get project subjects.', function(){
        return xnat.getSubjects("TestUMN1")
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
        return xnat.getSubjectExperiments("TestUMN1", "XNAT_S00001")
        .then(function(res){
            console.log(JSON.stringify(res, null, 2));
        });
        
	});

	lab.test('returns true when image is uploaded.', function(){

		var dir = "/NIRAL/work/jprieto/source/xnat-rest/temp/116845_06_DWI/MR-SE009-DWI_dir79_AP/";
		var files = fs.readdirSync(dir);

		return Promise.map(files, function(file){
			return xnat.uploadImage("TestUMN1", path.join(dir, file))
	        .then(function(res){
	            console.log(res);
	        });
		}, {
			concurrency: 1
		});
        
	});


	lab.test('returns true when user is logged out.', function(){

        return xnat.logout(user)
        .then(function(res){
            console.log(res);            
        });
        
	});
});