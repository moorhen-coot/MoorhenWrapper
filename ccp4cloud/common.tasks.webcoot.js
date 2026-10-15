
/*
 *  =================================================================
 *
 *    03.02.25   <--  Date of Last Modification.
 *                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *  -----------------------------------------------------------------
 *
 *  **** Module  :  js-common/tasks/common.tasks.webcoot.js
 *       ~~~~~~~~~
 *  **** Project :  jsCoFE - javascript-based Cloud Front End
 *       ~~~~~~~~~
 *  **** Content :  Web-Coot Model Building Task Class
 *       ~~~~~~~~~
 *
 *  (C) E. Krissinel, A. Lebedev 2023-2025
 *
 *  =================================================================
 *
 */

'use strict'; // *client*

var __template = null;
var __cmd      = null;

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')  {
  __template = require ( './common.tasks.template' );
  __cmd      = require ( '../common.commands' );
}

// ===========================================================================

function TaskWebCoot()  {

  if (__template)  __template.TaskTemplate.call ( this );
             else  TaskTemplate.call ( this );

  this._type     = 'TaskWebCoot';
  this.name      = 'webcoot (interactive model building)';
  this.setOName ( 'webcoot' );  // default output file name template
  this.title     = 'Model Building with WebCoot/Moorhen';
  this.nc_type   = 'browser-secure';   // job runs in-browser
  this.fasttrack = true;  // forces immediate execution

  this.input_dtypes = [{        // input data types
      data_type   : {'DataRevision' :['!phases']}, // data type(s) and subtype(s)
      label       : 'Structure revision', // label for input dialog
      inputId     : 'revision', // input Id for referencing input fields
      customInput : 'coot-mb',  // lay custom fields below the dropdown
      version     : 0,          // minimum data version allowed
      min         : 1,          // minimum acceptable number of data instances
      max         : 1           // maximum acceptable number of data instances
    },{
      data_type   : {'DataStructure':[],
                     'DataEnsemble' :[],
                     'DataModel'    :[],
                     'DataXYZ'      :[]
                    },  // data type(s) and subtype(s)
      label       : 'Additional structures', // label for input dialog
      inputId     : 'aux_struct', // input Id for referencing input fields
      version     : 0,            // minimum data version allowed
      min         : 0,            // minimum acceptable number of data instances
      max         : 20            // maximum acceptable number of data instances
    },{
      data_type   : {'DataLigand':[]},  // data type(s) and subtype(s)
      label       : 'Ligand data', // label for input dialog
      inputId     : 'ligand',      // input Id for referencing input fields
      min         : 0,             // minimum acceptable number of data instances
      max         : 1              // maximum acceptable number of data instances
    /*
    },{    // input data for making new ligand names
      data_type   : {'DataLigand':[]}, // this item is only for having list of
                                       // all ligands imported or generated
                                       // (not only those in revision)
      label       : '',        // no label for void data entry
      inputId     : 'void1',   // prefix 'void' will hide entry in import dialog
      version     : 0,         // minimum data version allowed
      force       : 1000,      // "show" all revisions available
      min         : 0,         // minimum acceptable number of data instances
      max         : 1000       // maximum acceptable number of data instances
    */
    }
  ];

  // this.parameters = { // input parameters
  //   NOTE : {  type     : 'label',
  //             label    : '<center style="white-space:normal;color:grey"><i>&nbsp;<p>' +
  //                        '<h2>This Task is Experimental</h2>' +
  //                        'WebCoot/Moorhen is developing fast aiming to deliver ' +
  //                        'Coot functionality in-browser; many Coot functions are ' +
  //                        'currently missing.<p>Please try it now and check ' +
  //                        'regularly in future!<br>Any feedback is highly appreciated.' +
  //                        '</i></center>',
  //             lwidth   : 500,
  //             position : [0,1,1,4]
  //          }
  // };


}

if (__template)
  __cmd.registerClass ( 'TaskWebCoot',TaskWebCoot,__template.TaskTemplate.prototype );
else    registerClass ( 'TaskWebCoot',TaskWebCoot,TaskTemplate.prototype );

// ===========================================================================
// export such that it could be used in both node and a browser

TaskWebCoot.prototype.icon           = function()  { return 'task_webcoot'; }
TaskWebCoot.prototype.clipboard_name = function()  { return '"WebCoot"';    }

TaskWebCoot.prototype.desc_title     = function()  {
// this appears under task title in the task list
  return 'fit atoms and new ligands in electron density, validate and explore with WebCoot/Moorhen';
}

TaskWebCoot.prototype.taskDescription = function()  {
// this appears under task title in the Task Dialog
  return 'Fit atoms and new ligands in electron density, validate and explore';
}

TaskWebCoot.prototype.cloneItems = function() { return ['backups']; }

//TaskWebCoot.prototype.cleanJobDir = function ( jobDir )  {}

TaskWebCoot.prototype.currentVersion = function()  {
let version = 0;
  if (__template)
        return  version + __template.TaskTemplate.prototype.currentVersion.call ( this );
  else  return  version + TaskTemplate.prototype.currentVersion.call ( this );
}

// function CootMBHotButton()  {
//   return {
//     'task'    : 'TaskWebCoot',
//     'tooltip' : 'Launch Coot for model building'
//   };
// }

TaskWebCoot.prototype.checkKeywords = function ( keywords )  {
// keywords supposed to be in low register
  return this.__check_keywords ( keywords,[
    'webcoot','moorhen','coot','model','building','manual-mb','mb','coordinate','editor'
  ]);
}

if (!__template)  {
  //  for client side

  TaskWebCoot.prototype.isTaskAvailable = function()  {

    if (isQtWebEngine())
      return ['incompatible-browser',
              'task is not compatible with the browser used',
              '<h3>Task is not compatible with the browser used</h3>' +
              'Consider using alternative task (Coot) or choose a different<br>' +
              'browser through ' + appName() + ' configuration utility.' ];
    else
      return TaskTemplate.prototype.isTaskAvailable.call ( this );

  }

  // hotButtons return list of buttons added in JobDialog's toolBar.
  TaskWebCoot.prototype.hotButtons = function()  {
    return [RefmacHotButton()];
  }

  TaskWebCoot.prototype.launchWebApp = function ( callback_func,
                                                  mode='model-building',
                                                  update_interval=3000 )  {
    // new MessageBox('Web-app', '<h1>Web application</h1>');

    if (!checkBrowserForWebCoot())  {
      callback_func ( false,'Moorhen' );
      return;
    }

    let title = '[' + padDigits(this.id,4) + '] ';
    if (this.uname.length>0)  title += this.uname;
                        else  title += this.name;
    let wab = new WebAppBox ( title );
    wab.setOnCloseFunction ( function(){
      callback_func ( getCommunicationFrameData(wab.fid,'was_output'),'Moorhen' ); 
    });
    wab.setOnToolbarCloseFunction ( function(){
      __comm_iframes[wab.fid].iframe.getWindow().postMessage ({
        command: 'call_exit'
      });
      return true;
    });
    wab.launch();
    // setCommunicationFrameData ( wab.fid,'was_output',false );

    let istruct    = this.input_data.data['revision'][0];
    let isubstruct = null;
    if (istruct._type=='DataRevision')  {
      if (istruct.Options.load_all)
        isubstruct = this.input_data.data['revision'][0].Substructure;
      istruct = this.input_data.data['revision'][0].Structure;
    }

    let viewSettings = null;

    let inputFiles = [];
    
    if ('ligand' in this.input_data.data)  {
      let ligands = this.input_data.data['ligand'];
      for (let i=0;i<ligands.length;i++)
        if (file_key.lib in ligands[i].files)  {
          let ligURL = this.getURL ( 'input/' + ligands[i].files[file_key.lib] );
          inputFiles.push ({
            type : 'ligand',
            // args : [ ligURL ]
            args : [ ligURL,[ligands[i].code] ]
          });
        }
    }

    // MTZ maps are grouped per file, { type:'mtz', url, maps:[MtzMapRequest] },
    // so that each file is fetched only once; the first map added is the active one
    let mtzInputs = {};
    let activeMap = true;
    function addMtzMap ( mtzURL,name,columns,options )  {
      if (!(mtzURL in mtzInputs))  {
        mtzInputs[mtzURL] = { type : 'mtz', url : mtzURL, maps : [] };
        inputFiles.push ( mtzInputs[mtzURL] );
      }
      let map = Object.assign ( { name : name, columns : columns }, options );
      map.calcStructFact = !!(columns.Fobs && columns.SigFobs && columns.FreeR);
      map.active = activeMap;
      activeMap  = false;
      mtzInputs[mtzURL].maps.push ( map );
    }

    if (istruct)  {
      let refkeys = getRefKeys ( istruct,this._type );
      if (refkeys)
        viewSettings = refkeys.keywords;
      if (file_key.lib in istruct.files)  {
        let libURL = this.getURL ( 'input/' + istruct.files[file_key.lib] );
        inputFiles.push ({
          type : 'ligand',
          args : [ libURL,[] ]
        });
      }
      if ((file_key.xyz in istruct.files) || (file_key.mmcif in istruct.files))  {
        let xyzURL = 'input/';
        if (file_key.mmcif in istruct.files)
              xyzURL = this.getURL ( xyzURL + istruct.files[file_key.mmcif] );
        else  xyzURL = this.getURL ( xyzURL + istruct.files[file_key.xyz]   );
        inputFiles.push ({
          type : 'pdb',
          args : [ xyzURL,'molecule' ]
        });
      }
      if ((this._type=='TaskWebCoot') && (file_key.mtz in istruct.files))  {
        let mtzURL = this.getURL ( 'input/' + istruct.files[file_key.mtz] );
        if (istruct.FWT)
          addMtzMap ( mtzURL,'map',{
                        F       : istruct.FWT,
                        PHI     : istruct.PHWT,
                        Fobs    : istruct.FP,
                        SigFobs : istruct.SigFP,
                        FreeR   : istruct.FreeR_flag
                      },{ isDifference : false });
        if (istruct.DELFWT)
          addMtzMap ( mtzURL,'diff-map',{
                        F   : istruct.DELFWT,
                        PHI : istruct.PHDELWT
                      },{ isDifference : true });
        if (istruct.FAN)
          addMtzMap ( mtzURL,'anom-map',{
                        F   : istruct.FAN,
                        PHI : istruct.PHAN
                      },{ isDifference : false,
                          style : { colour : { r: 0.733, g: 0.2, b: 1.0 } }
                      });
        if (istruct.DELFAN)
          addMtzMap ( mtzURL,'anom-diff-map',{
                        F   : istruct.DELFAN,
                        PHI : istruct.PHDELAN
                      },{ isDifference : true,
                          style : { positiveColour : { r: 0.055, g: 0.4, b: 0.333 },
                                    negativeColour : { r: 0.98 , g: 0.5, b: 0.45  } }
                      });
      }
    }

    if (isubstruct)  {
      if (!viewSettings)  {
        let refkeys = getRefKeys ( isubstruct,this._type );
        if (refkeys)
          viewSettings = refkeys.keywords;
      }
      if (file_key.mtz in isubstruct.files)  {
        let mtzURL = this.getURL ( 'input/' + isubstruct.files[file_key.mtz] );
        if (isubstruct.FAN)
          addMtzMap ( mtzURL,'anom-substr-map',{
                        F   : isubstruct.FAN,
                        PHI : isubstruct.PHAN
                      },{ isDifference : false,
                          style : { colour : { r: 0.686, g: 0.376, b: 0.102 } }
                      });
      }
    }

    if ('aux_struct' in this.input_data.data)  {
      let aux_struct = this.input_data.data['aux_struct'];
      for (let i=0;i<aux_struct.length;i++)
        if (file_key.xyz in aux_struct[i].files)  {
          if (!viewSettings)  {
            let refkeys = getRefKeys ( aux_struct[i],this._type );
            if (refkeys)
              viewSettings = refkeys.keywords;
          }
          let structURL = this.getURL ( 'input/' + aux_struct[i].files[file_key.xyz] );
          inputFiles.push ({
            type : 'pdb',
            args : [ structURL,'molecule_' + (i+1) ]
          });
        }
    }

    let params = {
      mode         : mode,
      inputFiles   : inputFiles,
      interval     : update_interval,
      no_data_msg  : '<h2>Data not found</h2>',
      preferences  : __user_settings.webcoot_pref,
      viewSettings : viewSettings,
      sf_meta      : { project : this.project,
                       id      : this.id,
                       fid     : wab.fid
                     },
      wdirURL      : this.getURL('')
    };

    // console.log (  JSON.stringify(inputFiles) );

    fetchFile ( 'js-lib/webCoot/webcoot.html',
      function(text){
        let dark_mode_html = '';
        if (('__active_color_mode' in window) && (window.__active_color_mode=='dark'))  {
          let dark_mode  = window.parent.__user_settings.color_modes.dark_mode;
          let dinvert    = 2.0 - dark_mode.invert;
          let dhue       = -dark_mode.hue;
          dark_mode_html = '  let scene = document.getElementById("root");\n' +
                           '  scene.style.setProperty("filter","invert(' + dinvert + 
                           ') hue-rotate(' + dhue + 'deg) ' + 
                           '");\n';
        }
        wab.iframe.setHTML (
          // text.replace ( '[[baseurl]]',
          //                window.location + 'js-lib/webCoot/webcoot.html' )
          text.replaceAll ( '[[prefix]]','js-lib/webCoot' )
              .replace ( '</body>',
                         '  <script type="text/javascript"  defer="defer">\n'  + 
                         '   runWebCoot ( ' + JSON.stringify(params) + ' );\n' +
                         dark_mode_html  +
                         '  </script>\n' +
                         '</body>'
                       )
        );
      },
      null,
      function(errcode){
        new MessageBox ( 'File not found',
            'file not found','msg_error' );
      });

  }

} else  {
  //  for server side

  const path  = require('path');
  const conf  = require('../../js-server/server.configuration');
  const prj   = require('../../js-server/server.fe.projects');
  const utils = require('../../js-server/server.utils');
  // let dtemp = require('../../js-common/dtypes/common.dtypes.template');

  TaskWebCoot.prototype.makeInputData = function ( loginData,jobDir )  {

    // put structure data in input databox for copying their files in
    // job's 'input' directory

    let revision = null;
    let istruct  = this.input_data.data['revision'][0];
    let istruct2 = null;
    if (istruct._type=='DataRevision')  {
      revision = this.input_data.data['revision'][0];
      if (revision.Options.leading_structure=='substructure')  {
        istruct  = revision.Substructure;
        istruct2 = revision.Structure;
      } else  {
        istruct  = revision.Structure;
        istruct2 = revision.Substructure;
      }
      if (istruct2 && ('load_all' in revision.Options) && revision.Options.load_all)
        this.input_data.data['istruct2'] = [istruct2];
    }
    this.input_data.data['istruct'] = [istruct];

    __template.TaskTemplate.prototype.makeInputData.call ( this,loginData,jobDir );

    if (istruct && ('coot_meta' in istruct) && istruct.coot_meta)  {
      let coot_meta = istruct.coot_meta;
      let srcJobDir = prj.getSiblingJobDirPath ( jobDir,coot_meta.jobId );
      for (let i=0;i<coot_meta.files.length;i++)
        utils.copyFile ( path.join(srcJobDir,coot_meta.files[i]),
                         path.join(jobDir,coot_meta.files[i]) );
    }

    // initialise backup directory
    let backupsDirPath = path.join ( jobDir,'backups' );
    utils.mkDir_check ( backupsDirPath );
    let backupsListFPath = path.join ( backupsDirPath,'backups.json' );
    if (!utils.fileExists(backupsListFPath))
      utils.writeString ( backupsListFPath,'[]' );

  }

  TaskWebCoot.prototype.getCommandLine = function ( jobManager,jobDir )  {
    return [conf.pythonName(), '-m', 'pycofe.tasks.webcoot', jobManager, jobDir,this.id ];
  }

  // -------------------------------------------------------------------------

  module.exports.TaskWebCoot = TaskWebCoot;

}
