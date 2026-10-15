/*
 *  =================================================================
 *
 *    17.01.25   <--  Date of Last Modification.
 *                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *  -----------------------------------------------------------------
 *
 *  **** Module  :  webcoot.js
 *       ~~~~~~~~~
 *  **** Project :  jsCoFE - javascript-based Cloud Front End
 *       ~~~~~~~~~
 *  **** Content :  WebCoot JS support
 *       ~~~~~~~~~
 *
 *  (C) E. Krissinel, F. Rodriguez 2023-2024
 *
 *  =================================================================
 *
 */

'use strict';

let rootId         = 'root';
let sf_meta        = null;
let urlPrefix      = 'js-lib/webCoot/MoorhenAssets';
// the jsCoFE server maps this path to $CLIBD_MON (CCP4 monomer library), see server.fe.communicate.js
let monomerLibrary = 'js-lib/webCoot/baby-gru/monomers';

if (document.currentScript)  {
  urlPrefix      = document.currentScript.getAttribute('data-parameter') + '/MoorhenAssets';
  monomerLibrary = document.currentScript.getAttribute('data-parameter') + '/baby-gru/monomers';
}

let BACKUPS        = [];
let backupsFPath   = 'backups/backups.json';
let backupFPrefix  = 'backups/backup_';

let moorhenWrapper = null;


function saveBackupList()  {
let bcopy = [];

  for (let i=0;i<BACKUPS.length;i++)  {
    let obj = JSON.parse ( JSON.stringify(BACKUPS[i]) );
    if (obj.data && (obj.data.length>100))
      obj.data = null;
    bcopy.push ( obj );
  }
  // post received in cofe.communication.js:onWindowMessage(...)
  window.parent.postMessage ({
    'command' : 'saveFiles',
    'files'   : [{ 'fpath' : backupsFPath,
                   'data'  : JSON.stringify(bcopy)
                }],
    'confirm' : false,
    'meta'    : sf_meta
  }, window.location );

}

// const exportToCloudCallback = (molName,molData) => {
//   window.parent.postMessage ({
//     'command' : 'saveFile',
//     'fpath'   : molName + '.pdb',
//     'data'    : molData,
//     'confirm' : 'model',
//     'meta'    : sf_meta
//   }, window.location );
// }

/*
const exitCallback = (viewSettings,molData) => {
// moldata = [{molName: string, pdbData: string; mmcifData: string}]
  let edata = {
      'command' : 'saveFiles',
      'files'   : [{ 'fpath'  : 'view_settings.json',
                     'data'   : JSON.stringify(viewSettings),
                     'report' : false
                  }],
      'confirm' : 'model',
      'meta'    : sf_meta
  };
  for (let i=0;i<molData.length;i++)
    edata.files.push ( molData[i] );
    // edata.files.push ({
    //   'fpath' : molData[i].molName + '.pdb',
    //   'data'  : molData[i].pdbData
    // });

  // post received in cofe.communication.js:onWindowMessage(...)
  window.parent.postMessage ( edata,window.location );

}
*/

const exitCallback = (resData) => {
// resDdata = {
//   viewData : {},
//   molData      : [{ molName: string, pdbData: string; mmcifData: string, searchModel: bool},
//   ligData      : {
//     ligCode : ligDictionary, // string
//     ...
//   }
// }
  
  let edata = {
      'command' : 'saveFiles',
      'files'   : [{ 'fpath'  : 'view_settings.json',
                     'data'   : JSON.stringify(resData.viewData),
                     'report' : false
                  }],
      'confirm' : 'model',
      'meta'    : sf_meta
  };
  for (let i=0;i<resData.molData.length;i++)
    edata.files.push ( resData.molData[i] );
    // edata.files.push ({
    //   'fpath' : molData[i].molName + '.pdb',
    //   'data'  : molData[i].pdbData
    // });

  // post received in cofe.communication.js:onWindowMessage(...)
  window.parent.postMessage ( edata,window.location );

}


const savePreferencesCallback = (preferences) => {
  window.parent.postMessage ({
    'command' : 'saveWebCootPreferences',
    'data'    : JSON.parse(JSON.stringify(preferences))
  }, window.location );
}
   
const saveBackupCallback = (obj) => {
  return new Promise((resolve, reject) => {
    if (obj.data.length>100)
      window.parent.postMessage ({
        'command' : 'saveFiles',
        'files'   : [{ 'fpath'   : backupFPrefix + obj.serNo,
                       'data'    : obj.data,
                    }],
        'confirm' : obj.type,
        'meta'    : sf_meta
      }, window.location );
    BACKUPS.push ( obj );
    saveBackupList();
    resolve();
  });
}

const loadBackupCallback = (serNo) => {
  return new Promise((resolve, reject) => {
    resolve ( BACKUPS.find ( i => i.serNo === serNo ) );
  });
}

const removeBackupCallback = (serNo) => {
  return new Promise((resolve, reject) => {
    BACKUPS = BACKUPS.filter ( i => i.serNo !== serNo );
    saveBackupList();
    resolve();
  });
}

const loadBackupList = () => {
  return new Promise((resolve,reject) => {
    resolve ( BACKUPS );
  });
}

function fetchFile ( furl,function_success,function_always,function_fail )  {
let oReq = new XMLHttpRequest();

  oReq.onload = function(oEvent) {
    function_success ( oReq.responseText );
    if (function_always)
      function_always();
  };

  oReq.onerror = function()  {
    if (function_fail)
      function_fail ( 'communication errors' );
    if (function_always)
      function_always();
  }

  oReq.overrideMimeType ( "text/plain; charset=x-user-defined" );
  // oReq.responseType = 'arraybuffer';
  oReq.timeout = 9999999;
  oReq.open ( 'POST',furl,true );

  try {
    oReq.send(null);
  } catch (e) {
    if (function_fail)
      function_fail ( 'general error' );
  }

}

function onWindowMessage ( event )  {
var edata = event.data;
  if (edata.command=='call_exit')  {
    if (moorhenWrapper)
      moorhenWrapper.exit();
  } else
    alert ( ' signals back ' + JSON.stringify(edata) );
}

if (window.addEventListener) {
  window.addEventListener ( 'message', onWindowMessage, false );
} else if (window.attachEvent) {
  window.attachEvent ( 'onmessage', onWindowMessage, false );
} else 
  alert ( 'No Window messaging in WebCoot' );



function launchApp ( params )  {

  console.log ( ' >>>>>>>> window.isSecureContext=' + window.isSecureContext );
  console.log ( ' >>>>>>>> window.crossOriginIsolated=' + window.crossOriginIsolated );

  moorhenWrapper = new moorhen.MoorhenWrapper ( urlPrefix );
  moorhenWrapper.setMonomerLibrary ( monomerLibrary );

  moorhenWrapper.setRootId     ( rootId     );
  moorhenWrapper.setInputFiles ( params.inputFiles );
  if (params.preferences)  moorhenWrapper.setPreferences         ( params.preferences );
  if (params.no_data_msg)  moorhenWrapper.setNoDataLegendMessage ( params.no_data_msg );
  moorhenWrapper.addOnChangePreferencesListener ( savePreferencesCallback );

  switch (params.mode)  {
    case "view-update"  : moorhenWrapper.setWorkMode       ( 'view'   );
                          moorhenWrapper.setUpdateInterval ( params.interval );
                        break;
    case "view"         : moorhenWrapper.setWorkMode       ( 'view'   );
                        break;
    default             : //moorhenWrapper.addOnExportListener       ( exportToCloudCallback );
                          moorhenWrapper.addOnExitListener         ( exitCallback          );
                          moorhenWrapper.setBackupSaveListener     ( saveBackupCallback    );
                          moorhenWrapper.setBackupListLoadListener ( loadBackupList        );                          //  moorhenWrapper.start()
                          moorhenWrapper.setBackupLoadListener     ( loadBackupCallback    );
                          moorhenWrapper.setRemoveBackupListener   ( removeBackupCallback  );
  }

  // ##### dirty trick: do not set view settings before lighting in Moorhen is fixed;
  // ##### setting the view scene destroys the lighting object and all model colours 
  // ##### change to black
  // if (('viewSettings' in params) && params.viewSettings)
  //   moorhenWrapper.setViewSettings ( params.viewSettings );

  moorhenWrapper.start();

}


function runWebCoot ( params )  {
//
//   params = {
//     mode        : 'mode',
//     inputFiles  : [],
//     interval    : 1000,
//     no_data_msg : 'no_data_msg',
//     preferences : {},
//     sf_meta     : {},
//     wdirURL     : 'wdirURL'
//   }
//

  sf_meta = params.sf_meta;

  BACKUPS = [];

  if (params.wdirURL)  {
    // work directory URL given, find and load backups

    fetchFile ( params.wdirURL + '/' + backupsFPath,
      function(text){
        // Get the backups list
        try {
          BACKUPS = JSON.parse ( text );
        } catch(e) {
          BACKUPS = [];
        }
        // Load backups in the background, without waiting. Slightly risky but 
        // should work given webcoot start-up times. Rewrite this in case of
        // problems
        for (let i=0;i<BACKUPS.length;i++)
          if (!BACKUPS[i].data)
            (function(backupNo){
              fetchFile ( params.wdirURL + '/' + backupFPrefix + BACKUPS[backupNo].serNo,
                function(txt){
                  BACKUPS[backupNo].data = txt;
                  // console.log ( ' >>>>> loaded backup #' + backupNo + ' : ' + BACKUPS[backupNo].serNo + ' : ' + text.length )
                },
                null,
                function(errcode){
                  alert ( 'Backup #' + backupNo + ' could not be obtained' );
                });
            }(i))
        // start WebCoot
        launchApp ( params );
      },
      null,
      function(errcode){
        alert ( 'WebCoot backup directory not found. Backups are not available.' );
        launchApp ( params );
        // new MessageBox ( 'File not found',
        //     'file not found','msg_error' );
      });

  } else
    launchApp ( params );

}
