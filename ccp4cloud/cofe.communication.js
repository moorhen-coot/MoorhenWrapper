
/*
 *  =================================================================
 *
 *    03.07.26   <--  Date of Last Modification.
 *                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *  -----------------------------------------------------------------
 *
 *  **** Module  :  js-client/cofe.communication.js
 *       ~~~~~~~~~
 *  **** Project :  jsCoFE - javascript-based Cloud Front End
 *       ~~~~~~~~~
 *  **** Content :  Communication functions
 *       ~~~~~~~~~  
 * 
 *   function validateUserData      ( user_inp,email_inp,login_inp )
 *   function makeCommErrorMessage  ( title,request_type,response )
 *   function checkVersionMatch     ( response,localServer_bool )  
 *   function makeJSONString        ( data_obj )
 *   function clearNetworkIndicators()
 *   function __process_network_indicators()
 *   function processServerQueue    ()
 *   function processLocalQueue     ()
 *   function printServerQueueState ( checkPoint)
 *   function __server_command      ( cmd,data_obj,page_title,function_response,
 *                                    function_always,function_fail,sqid )
 *   function __server_request      ( request_type,data_obj,page_title,function_ok,
 *                                    function_always,function_fail,sqid )
 *   function local_command         ( cmd,data_obj,command_title,function_response )
 *   function promptSessionCheck    ( cmd )
 *   function serverCommand         ( cmd,data_obj,page_title,function_response,
 *                                    function_always,function_fail )
 *   function serverRequest         ( request_type,data_obj,page_title,function_ok,
 *                                    function_always,function_fail )
 *   function localCommand          ( cmd,data_obj,command_title,function_response )
 *   function downloadFile          ( uri )
 *   function fetchFile             ( furl,function_success,function_always,
                                      function_fail )
 *   function fetchJobFile          ( task,fname,function_success,function_always,
                                      function_fail )
 *   function fetchJobOutputFile    ( task,fname,function_success,function_always,
                                      function_fail )
 *   function getJobFileURL             ( jobId,filePath )
 *   function downloadJobFile           ( jobId,filePath )
 *   function setCommunicatingIFrame    ( holder,iframe )
 *   function setCommunicationFrameData ( fid,dataName,data )
 *   function getCommunicationFrameData ( fid,dataName )
 *   function removeCommunicatingIFrame ( fid )
 *   function getNofCommunicatingIFrames()
 *   function onWindowMessage           ( event )
 *
 *  (C) E. Krissinel, A. Lebedev 2016-2026
 *
 *  =================================================================
 *
 */

'use strict';

var cofe_signals = {
  taskReady       : 'task_ready',         // fired by Job Dialog's input panels
  jobStarted      : 'job_started',        // fired by JobTree
  treeUpdated     : 'tree_updated',       // fired by JobTree
  reloadTree      : 'reload_tree',        // fired by JobTree
  makeProjectList : 'make_project_list',  // fired by JobTree
  jobDialogOpened : 'job_dialog_opened',  // fired by JobTree
  rationUpdated   : 'ration_updated',     // fired by JobTree
  jobDlgSignal    : 'job_dlg_signal',
  uploadEvent     : 'uploadEvent'         // fired by Upload module
}


function validateUserData ( user_inp,email_inp,login_inp,globus_inp )  {
//  All parameters are InputText classes, corresponding to the input of
//  user name, e-mail and login name, respectively
let msg = '';

  if (user_inp.getValue().length<=0)
    msg += '<b>User name</b> must be provided.<p>';
  /*
  else if (user_inp.element.validity.patternMismatch)
    msg += '<b>User name</b> should only contain latin letters, dots,<br>' +
           'dashes and spaces.<p>';
  */

  if (email_inp.getValue().length<=0)
    msg += '<b>E-mail address</b> must be provided.<p>';
  else if (email_inp.element.validity.typeMismatch)
    msg += '<b>E-mail address</b> should the correct one. Your temporary<br>' +
           'password will be sent to the e-mail provided.<p>';

  if (login_inp.getValue().length<=0)
    msg += '<b>Login name</b> must be provided.<p>';
  else if (login_inp.element.validity.patternMismatch)
    msg += '<b>Login name</b> should contain only latin letters, numbers,<br> ' +
           'underscores, dashes and dots, and must start with a letter.<p>';


  if (globus_inp && (globus_inp.getValue().length>0) && 
      globus_inp.element.validity.patternMismatch)
    msg += '<b>Globus Id</b> is not formatted correctly.<p>';

  return msg;

}


function makeCommErrorMessage ( title,request_type,response )  {
// starts respective error message dialog
//    title:     dialog title string, which should correspond to error context
//    response:  Response structure

  switch (response.status)  {

    case fe_retcode.readError:
        MessageDataReadError ( title,response.message );
      break;

    case fe_retcode.jobballError:
        MessageDataReadError ( title,response.message );
      break;

    case fe_retcode.noProjectData:
        MessageNoProjectDataError ( title,response.message );
      break;

    case fe_retcode.writeError:
        MessageDataWriteError ( title,response.message );
      break;

    case fe_retcode.mkDirError:
        MessageMkDirError ( title,response.message );
      break;

    case fe_retcode.notLoggedIn:
        if (request_type!=fe_reqtype.logout)
          console.log ( ' +++ attempt to logout on user is not logged in' );
          logout ( __current_page.element.id,logout_code.user_logout,function(){
            MessageNotLoggedIn ( title );
          });
      break;

    case fe_retcode.uploadErrors:
        MessageUploadErrors ( title,response.message );
      break;

    case fe_retcode.noJobDir:
        MessageNoJobDir ( title );
      break;

    case fe_retcode.proxyError:
        MessageProxyError ( title );
      break;

    case fe_retcode.projectAccess:
        MessageProjectAccess ( title );
      break;

    case fe_retcode.serverInactive:
        MessageServerInactive();
      break;

    case fe_retcode.fileNotFound:
        MessageFileNotFound ( response.message );
      break;

    default:
        //alert ( 'unknown error, response='+JSON.stringify(response) );
        MessageUnknownError ( title,'"'+response.message+'"' );

  }

}


function checkVersionMatch ( response,localServer_bool )  {

  let v0 = appVersion().split(' ')[0];
  let rs = response.version.split(' ');
  let v1 = rs[0];

  if (localServer_bool)
    return true;  // may need a better solution

  if (response.version!='*')  {  // else ignore (useful for debugging)

    if ((rs.length>2) && (rs[2]=='client') && response.data.fe_url)
      __fe_url = response.data.fe_url;

    if (v0<v1)  {
      if ((rs.length>2) && (rs[2]=='client'))  {
        new MessageBoxF ( appName() + ' client update',
            '<div style="width:450px"><center>'   + appName() + 
            ' Client has been updated to version' +
            '<br><center><sup>&nbsp;</sup><b><i>' + rs[0] + ' ' + rs[1] + 
            '</i></b><sub>&nbsp;</sub></center>'  +
            'This version is higher than the current server version<br>' +
            '<center><sup>&nbsp;</sup><b><i>'     + appVersion() + 
            '</b></i><sub>&nbsp;</sub></center>which may cause incompatibility.' +
            '<br><hr/>' +
            '<p>The ' + appName() + ' client is now disabled, which prevents the ' +
            'use of local applications like Coot.' +
            '<p>This is typically resolved by a server update. Please contact your ' +
            appName() + ' server administrator to request an upgrade.' +
            '<hr/></center></div>',
            'Continue', function(){
              window.location = response.data.fe_url;
            },true,  'msg_excl' );
        return false;
      } else if (rs.length<=2) {
        // console.log ( ' >>>>>> url=' + response.url + '  ' + __remoteJobServer.url );
        if (response.url.endsWith(fe_command.remoteCheckIn))  {
          // this works if version mismatch is detected between local cloud and
          // remote jobs server
          new MessageBoxF ( appName() + ' update notice',
              '<div style="width:500px"><center><h2>' + appName() + ' Update Notice</h2>' +
              'Remote ' + appName() + ' server has been updated to version<br>' +
              '<center><sup>&nbsp;</sup><b><i>' + response.version + 
              '</i></b><sub>&nbsp;</sub></center>' +
              'This version is incompatible with your local version<br><center><sup>&nbsp;</sup><b><i>'
              + appVersion() + '</b></i><sub>&nbsp;</sub></center>' +
              '<hr/>As a result, remote job submission has been disabled. To restore ' +
              'access to the remote server, please update your local CCP4 installation ' +
              'to the latest version.<hr/></center></div>',
              'Understood', function(){
                __remoteJobServer = { url: null, status: 'nourl' };
                __remote_environ_server = [];
              },true,  'msg_information' );
          return true;
        } else  {
          // this works if server is updated in the midst of user's session
          new MessageBoxF ( appName() + ' update notice',
              '<div style="width:500px"><center><h2>' + appName() + ' Update Notice</h2>' +
              + appName() + ' server has been updated to version<br><center><sup>&nbsp;</sup><b><i>' +
              response.version + '</i></b><sub>&nbsp;</sub></center>' +
              'This version is incompatible with your local version<br><center><sup>&nbsp;</sup><b><i>'
              + appVersion() + '</b></i><sub>&nbsp;</sub></center>' +
              '<hr/>The ' + appName() + ' interface will now update in your browser. This update ' +
              'will require a restart of your session, and you will be logged out.<br>' +
              'Please log in again after the update is complete. Your projects and data will be ' +
              'safe. Please note that you may be unable to clone some older tasks.' +
              '<hr/></center></div>',
              'Update', function(){
                location.reload();
              },true,  'msg_excl' );
          return false;
        }
      }
    }
  }

  return true;

}


function makeJSONString ( data_obj )  {
let json = null;

  try {
    json = JSON.stringify ( data_obj );
  } catch(e) {
    new MessageBox ( 'Unsuitable data',
      '<div style="width:500px"><h2>Unsuitable data</h2>' +
      '<p>Unsuitable data encountered when sending data to ' + appName() +
      ' server. Usually this is caused by using symbols from a non-Latin ' +
      'alphabet or rare special characters.' +
      '<p>Try repeating your actions making sure that your keyboard is on ' +
      'English register. If this does not help, close this page or tab in ' +
      'your browser and log on ' + appName() + ' again. Ultimately, contact ' +
      appName() + ' support.</div>', 'msg_error' );
  }
  return json;
}


// ===========================================================================
// __lid_closed_period captures period when device seem to be inactive/blocked 
// but powered on. This can be because of lid closed, but can also occur if
// main thread in browser was held by, e.g., CPU-intensive task or similar.
// In either case, network communications could have been impacted during 
// this period, which fact is used in communication functions.

var __lid_close_check_interval = 1000; //ms
var __last_active_time = Date.now();
var __lid_close_time   = __last_active_time;
var __lid_open_time    = __last_active_time;
var __lid_open         = true;

function systemSleeps()  {
  return (!__lid_open) || (__last_active_time<=__lid_open_time);
}

function systemAwake()  {
  return __lid_open  && (__last_active_time>__lid_open_time);
}

function checkActiveState()  {
  if (document.hidden)  {
    if (__lid_open)  {
      __lid_close_time = __last_active_time;
      console.log ( ' [' + getCurrentTimeString(__lid_close_time) + 
                    '] likely lid closed' );
      __lid_open = false;
      stopRequestQueues();
    }
  } else  {
    let t0 = __last_active_time;
    __last_active_time = Date.now();
    if ((__last_active_time>t0+4*__lid_close_check_interval) || (!__lid_open))  {
      __lid_open_time = __last_active_time;
      __lid_open      = true;
      console.log ( ' [' + getCurrentTimeString(__lid_open_time) + 
                    '] likely resumed from sleep/lid close' );
      stopRequestQueues  ();  // if any requests were still pending, kill them
      resumeRequestQueues();
    }
  }
}

document.addEventListener ( 'visibilitychange', () => {
  checkActiveState();
});

setInterval ( function(){
  checkActiveState();
},__lid_close_check_interval);


// ===========================================================================
// Communication functions

var __server_queue    = [];
var __local_queue     = [];
var __server_queue_id = 1;

var __delays_ind      = null;
var __delays_timer    = null;
var __delays_wait     = 1000;  //msec
var __holdup_dlg      = null;
var __holdup_timer    = null;
var __holdup_wait     = 20000;  //msec
var __communication_ind = null;

function clearNetworkIndicators()  {
  if (__delays_timer)
    window.clearTimeout ( __delays_timer );
  __delays_ind   = null;  // communication delays indicator
  __delays_timer = null;
  __communication_ind = null;  // blinking green dot, global reference
}

function __process_network_indicators()  {
  if (__server_queue.length>0)  {
    if (__communication_ind && (!__communication_ind.isVisible()))
      __communication_ind.fade ( true );
  } else if (__delays_ind)  {
    if (__delays_timer)  {
      window.clearTimeout ( __delays_timer );
      __delays_timer = null;
    }
    if (__delays_ind.isVisible())
      __delays_ind.hide();
    if (__holdup_timer)  {
      window.clearTimeout ( __holdup_timer );
      __holdup_timer = null;
    }
    if (__holdup_dlg)  {
      __holdup_dlg.close();
      __holdup_dlg = null;
    }
    if (__communication_ind.isVisible())
      __communication_ind.fade ( false );
  }
}

var __check_session_drops = 0;

function processServerQueue()  {
  if ((__server_queue.length>0) && __lid_open)  {
    let q0 = __server_queue[0];
    if (q0.status=='waiting')  {
      q0.status = 'running';
      q0.start_time = Date.now();
      if (q0.type=='command')
        __server_command ( q0.request_type,q0.data_obj,q0.page_title,
                           q0.function_response,q0.function_always,
                           q0.function_fail,q0.id,q0.start_time,
                           q0.timeout );
      else
        __server_request ( q0.request_type,q0.data_obj,q0.page_title,
                           q0.function_ok,q0.function_always,
                           q0.function_fail,q0.id,q0.start_time,
                           q0.timeout );
    }
    if (__delays_ind && (!__delays_ind.isVisible()) && (!__delays_timer))  {
      __delays_timer = window.setTimeout ( function(){
        if (q0.start_time>__lid_open_time)
          __delays_ind.show();  // shows "network delays" runner
      },__delays_wait);
      __holdup_timer = window.setTimeout ( function(){
        // suspected network problem, ask user to keep waiting or to 
        // restart the session
        __holdup_timer = null;
        // if ((__server_queue.length>0) && (q0.start_time>__lid_open_time)) {
        if ((__server_queue.length>0) && __lid_open && (q0.start_time>__lid_open_time)) {
          if ((__server_queue[0].type=='command') &&
              (__server_queue[0].request_type==fe_command.checkSession) &&
              (__check_session_drops<10))  {
            __check_session_drops++;
            __server_queue.shift();
            __process_network_indicators();
            processServerQueue();
          } else if (__server_queue[0].request_type!=undefined)  {
                // 'Communication with ' + appName() + ' is severely delayed. ' +
                // 'Please be patient, the problem may resolve in few moments, ' +
                // 'after which this dialog will disappear automatically.<p>' +
                // 'If communication does not resume after a long time, you can ' +
                // 'either reload the current page (quick option) or start new ' +
                // 'working session (complete refresh, hard option) using buttons ' +
                // 'below.<p>Make sure that your Internet connection is stable.',[
            let rstip = __remoteJobServer.status!='FE' ? '' :
              ' Your session is connected to a remote ' + appName() + 
              ' server. If you continue experiencing network delays, <b>try ' +
              'disconnecting from the remote server.</b>';
            __holdup_dlg = new QuestionBox ( 'Communication hold-up',
              '<div style="width:450px"><h3>Communication hold-up</h3>' +
              'Communication with ' + appName() + ' is currently experiencing ' +
              'significant delays. Please be patient - the issue may resolve ' +
              'on its own in a few moments, and this dialog will close ' +
              'automatically.' +
              '<p>If the connection does not resume after a while, you can ' +
              'try one of the following options:<ul>' +
              '<li>Reload the current page (quick fix), or</li>' +
              '<li>Start a new session (complete refresh — more thorough).</li>' +      
              '</ul>Also, please ensure that your internet connection is stable.' +
              rstip + '</div>',
              [
                { name    : 'Reload current page',
                  onclick : function(){
                      __holdup_dlg = null;
                      window.setTimeout ( function(){
                        if (__current_page)  {
                          __server_queue = [];
                          __process_network_indicators();
                          makePage ( function(){
                            makeNewInstance ( __current_page._type,__current_page.sceneId );
                          });
                          makeSessionCheck ( __current_page.sceneId );
                        } else  {  // should never come to here
                          reloadBrowser();
                        }
                      },100);
                    }
                },{
                  name    : 'Start new working session',
                  onclick : function(){
                      reloadBrowser();
                      // window.location = window.location;  // complete refresh
                    }
                }
              ],
              'msg_system'
            );
          } else  {
            console.log ( ' !!!!! undefined server request delayed' );
          }
        }
      },__holdup_wait);
    }
  }
}

// function shiftServerQueue()  {
//   if (__server_queue.length>0)  {
//     __server_queue.shift();
//     processServerQueue();
//   }
// }

function processLocalQueue()  {
  if ((__local_queue.length>0) && __lid_open)  {
    let q0 = __local_queue[0];
    if (q0.status=='waiting')  {
      q0.status = 'running';
      __local_queue[0].xhr = local_command ( q0.request_type,q0.data_obj,
                                             q0.command_title,
                                             q0.function_response );
    }
  }
}

function stopRequestQueues()  {
  for (let i=0;i<__server_queue.length;i++)
    if (('xhr' in __server_queue[i]) && __server_queue[i].xhr)  {
      console.log ( ' [' + getCurrentTimeString(__lid_open_time) + 
                    '] killing server request '  + 
                    __server_queue[i].id   + ' ' +
                    __server_queue[i].type + ' ' + 
                    __server_queue[i].request_type );
      __server_queue[i].xhr.abort();
      __server_queue[i].xhr    = null;
      __server_queue[i].status = 'waiting';
    }
  for (let i=0;i<__local_queue.length;i++)
    if (('xhr' in __local_queue[i]) && __local_queue[i].xhr)  {
      console.log ( ' [' + getCurrentTimeString(__lid_open_time) + 
                    '] killing local request '  + 
                    __local_queue[i].id   + ' ' +
                    __local_queue[i].type + ' ' + 
                    __local_queue[i].request_type );
      __local_queue[i].xhr.abort();
      __local_queue[i].xhr    = null;
      __local_queue[i].status = 'waiting';
    }
}


function resumeRequestQueues()  {
  processServerQueue();
  processLocalQueue ();
}

// function shiftLocalQueue()  {
//   if (__local_queue.length>0)  {
//     __local_queue.shift();
//     processServerQueue();
//   }
// }

function printServerQueueState ( checkPoint)  {
  if (__server_queue.length>0)
    console.log (
      ' ||||| ' + checkPoint + ' queue.length='  + __server_queue.length +
      ' queue[0].type=' + __server_queue[0].type +
      ' request_type='  + __server_queue[0].request_type +
      ' ndrops=' + __check_session_drops
    );
  else
    console.log ( ' ||||| ' + checkPoint + ' queue.length='  + __server_queue.length );
}


var __request_timing = {
  time_min : 1.0e30,
  time_sum : 0.0,
  n_sum    : 0,
  time_max : 0.0
};

function __log_request_timing ( dt )  {
  __request_timing.time_min  = Math.min ( __request_timing.time_min,dt );
  __request_timing.time_sum += dt;
  __request_timing.n_sum++;
  __request_timing.time_max  = Math.max ( __request_timing.time_max,dt );
}

function __server_command ( cmd,data_obj,page_title,function_response,
                            function_always,function_fail,sqid,start_time,
                            timeout=1000000,attemptNo=10 )  {
// used when no user is logged in

  let json = makeJSONString ( data_obj );
  let xhr  = null;

  if (json)
    xhr = $.ajax ({
      url      : cmd,
      async    : true,
      type     : 'POST',
      data     : json,
      timeout  : timeout,   // milliseconds
      dataType : 'text'
      // error: function(xhr, ajaxOptions, thrownError) {
      //             alert(thrownError + "\r\n" + xhr.statusText + "\r\n" + xhr.responseText);
      //           }
    })
    .done ( function(rdata) {
      if ((__server_queue.length>0) && (sqid==__server_queue[0].id))  {
        __log_request_timing ( performance.now()-__server_queue[0].t_requested );
        __server_queue.shift();
        __process_network_indicators();
        try {
          let rsp = jQuery.parseJSON ( rdata );
          rsp.url = cmd;
          if (checkVersionMatch(rsp,false))  {
            let response = jQuery.extend ( true, new Response(), rsp );
            if (!function_response(response))
              makeCommErrorMessage ( page_title,cmd,response );
          }
        } catch(err) {
          console.log ( ' [' + getCurrentTimeString() + 
                        '] (c) error catch in __server_command.done: ' + err +
                        ' reqid=' + sqid );  
          console.log ( ' rdata = ' + rdata );
          // printServerQueueState ( 1 );
        }
        // *** old version
        // processServerQueue();
      } else  {
        console.log ( ' [' + getCurrentTimeString() +
                      '] (c) return on skipped operation in __server_command.done' +
                      ' cmd=' + cmd + ' reqid=' + sqid );
        console.log ( ' rdata = ' + rdata );
        // printServerQueueState ( 2 );
        // *** new version
        if (__server_queue.length>0)  {
          __server_queue.shift();
          __process_network_indicators();
        } //else
          //makeSessionCheck ( __current_page.sceneId );
      }
      __check_session_drops = 0;
      // *** new version
      processServerQueue();
    })
    .always ( function(){
      // __check_session_drops = 0;
      if (function_always)
        function_always();
    })
    .fail ( function(xhr,err){

      if (__lid_open && ((start_time>__lid_open_time) || (attemptNo<=0)))  {
        // genuine transaction failure

        console.log ( ' [' + getCurrentTimeString() + 
                      '] (c) cmd=' + cmd + ' err=' + err + ' ndrops=' + 
                      __check_session_drops + ' timeout=' + timeout +
                      ' reqid=' + sqid );
        // can be "error" and "timeout"
        if ((__server_queue.length<=0) || (sqid!=__server_queue[0].id))  {
          console.log ( ' [' + getCurrentTimeString() + 
                        '] (c) return on skipped operation in __server_command.fail, cmd=' + 
                        cmd +' err=' + err + ' reqid=' + sqid);
          // printServerQueueState ( 3 );
        }
        if (cmd==fe_command.checkSession)
          __check_session_drops++;
        if (function_fail)
              function_fail      ( xhr,err );
        else  MessageAJAXFailure ( page_title,xhr,err );
        // __server_queue.shift();
        __process_network_indicators();
        // *** old version
        processServerQueue();

        /*
      } else  {
        // transaction likely failed because the system was down (lid closed)
        // try recovering by repeating transaction
        console.log ( ' [' + getCurrentTimeString() + 
                      '] (c) trying to recover after system sleep, attempt ' + 
                      attemptNo + ' cmd=' + cmd + ' reqid=' + sqid );
        window.setTimeout ( function(){
          __server_command ( cmd,data_obj,page_title,function_response,
                             function_always,function_fail,sqid,start_time,
                             timeout,attemptNo-1 );
        },__lid_close_check_interval);
        // },Math.max(1000,1000*(11-attemptNo)));
        */
      }

    });

  // should be just a single item in the queue in most cases, and 0th
  // item should be the one in 99.99% cases
  for (let i=0;i<__server_queue.length;i++)
    if (__server_queue[i].id==sqid)  {
      __server_queue[i].xhr = xhr;
      break;
    }

}


function __server_request ( request_type,data_obj,page_title,function_ok,
                            function_always,function_fail,sqid,start_time,
                            timeout=1000000,attemptNo=10 )  {
// used when a user is logged in

  let request = new Request ( request_type,__login_token,data_obj );
  let json    = makeJSONString ( request );

  function execute_ajax ( npersists )  {

    let xhr = $.ajax ({
      url         : fe_command.request,
      async       : true,
      type        : 'POST',
      data        : json,
      processData : false,
      timeout     : timeout,   // milliseconds
      dataType    : 'text'
    })
    .done ( function(rdata) {
      // successful transaction

      let response = null;

      if ((__server_queue.length>0) && (sqid==__server_queue[0].id))  {

        __log_request_timing ( performance.now()-__server_queue[0].t_requested );
        __server_queue.shift();  // request completed
        __process_network_indicators();

        try {
          let rsp = jQuery.parseJSON ( rdata );
          rsp.url = fe_command.request;
          if (checkVersionMatch(rsp,false))  {
            response = jQuery.extend ( true, new Response(), rsp );
            if (response.status==fe_retcode.ok)  {
              if (function_ok)
                function_ok ( response.data );
            } else
              makeCommErrorMessage ( page_title,request_type,response );
          }
        } catch(err) {
          console.log ( ' [' + getCurrentTimeString() + 
                        '] (r) error catch in __server_request.done:' +
                        '\n --- ' + err +
                        '\n --- request type: ' + request_type +
                        '\n --- rdata = ' + rdata +
                        '\n --- reqid='   + sqid );
        }
      } else  {
        console.log ( ' [' + getCurrentTimeString() +
                      '] (r) return on skipped operation in __server_request.done' +
                      ' request type=' + request_type +
                      ' reqid=' + sqid );
        // printServerQueueState ( 5 );
        // *** new version
        if (__server_queue.length>0)  {
          __server_queue.shift();
          __process_network_indicators();
        } else
          makeSessionCheck ( __current_page.sceneId );
      }

      __check_session_drops = 0;

      // *** new version
      processServerQueue();

      // we put this function here and in the fail section because we
      // do not want to have it executed multiple times due to multiple
      // retries
      if (function_always)  {
        if (response)  function_always(0,response.data);
                else   function_always(0,{});
      }

    })

    .always ( function(){
      // __check_session_drops = 0;
    })

    .fail ( function(xhr,err){

      if (__lid_open && ((start_time>__lid_open_time) || (attemptNo<=0)))  {
        // genuine transaction failure

        console.log ( ' [' + getCurrentTimeString() + 
                      '] (r) failed request=' + request_type + ' err=' + err +
                      ' reqid=' + sqid );
        // can be "error" and "timeout"

        if ((__server_queue.length>0) && (sqid==__server_queue[0].id))  {

          // *** old version
          __server_queue.shift();  // request completed
          __process_network_indicators();

          try {

            if ((typeof function_fail === 'string' || function_fail instanceof String) &&
                (function_fail=='persist')) {

              if (npersists>0)  {
                execute_ajax ( npersists-1 );
                return;  // repeat; server queue is not shifted here
              } else
                MessageAJAXFailure ( page_title,xhr,err );

            } else if (function_fail)
              function_fail ( xhr,err );
            else
              MessageAJAXFailure ( page_title,xhr,err );

            // we put this function here and in done section because we do not
            // want to have it executed multiple times due to multiple retries
            if (function_always)
              function_always ( 1,{} );

          } catch(err) {
            console.log ( ' [' + getCurrentTimeString() +
                          '] (r) error catch in __server_request.fail: ' + err +
                          ' request type=' + request_type + ' reqid=' + sqid );
            // printServerQueueState ( 6 );
          }

          // *** old version
          // processServerQueue();

        } else  {
          console.log ( ' [' + getCurrentTimeString() +
                        '] (r) return on skipped operation in __server_request.fail' +
                        ' request type=' + request_type +' reqid=' + sqid );
          // printServerQueueState ( 7 );
          // *** new version
          if (__server_queue.length>0)  {
            __server_queue.shift();
            __process_network_indicators();
          } else
            makeSessionCheck ( __current_page.sceneId );
        }

        // *** new version
        processServerQueue();

        /*
      } else  {
        // transaction likely failed because the system was down (lid closed)
        // try recovering by repeating transaction
        console.log ( ' [' + getCurrentTimeString() + 
                      '] (r) trying to recover after system sleep, attempt ' + 
                      attemptNo + ' request type=' + request_type + 
                      ' reqid=' + sqid );
        window.setTimeout ( function(){
          __server_request ( request_type,data_obj,page_title,function_ok,
                             function_always,function_fail,sqid,start_time,
                             timeout,attemptNo-1 );
        },__lid_close_check_interval);
        // },Math.max(__lid_close_check_interval,
        //            __lid_close_check_interval*(11-attemptNo)));
        */
      }

    });

    // should be just a single item in the queue in most cases, and 0th
    // item should be the one in 99.99% cases
    for (let i=0;i<__server_queue.length;i++)
      if (__server_queue[i].id==sqid)  {
        __server_queue[i].xhr = xhr;
        break;
      }

    // return xhr;

  }

  if (json)
    execute_ajax ( __persistence_level );
  else if (__server_queue.length>0)
    __server_queue[0].xhr = null;

}


function local_command ( cmd,data_obj,command_title,function_response )  {
// used to communicate with local (client-side) server
//   cmd:               an NC command
//   data_obj:          data object to pass with the command
//   command_title:     identification title for error messages
//   function_response: callback function, invoked when server replies to
//                      command. The only argument to response function is
//                      a common.commands::Response class filled with data
//                      sent by the server. The function should return false
//                      in case something is wrong, in which case a
//                      communication error message box is displayed.

  let json = makeJSONString ( data_obj );
  let xhr  = null;

  if (__local_service && json)  {
    let start_time = Date.now();
    let url = __local_service + '/' + cmd;
    xhr = $.ajax ({
      url      : url,
      async    : true,
      type     : 'POST',
      data     : json,
      dataType : 'text',
      crossDomain: true,
      timeout  : 0  // in ms; '0' means no timeout
    })
    .done ( function(rdata) {
      let rsp = jQuery.parseJSON ( rdata );
      rsp.url = url;
      if (checkVersionMatch(rsp,true))  {
        let response = jQuery.extend ( true,new Response(),rsp );
        if (function_response && (!function_response(response)))
          makeCommErrorMessage ( command_title,cmd,response );
      }

    })
    .always ( function(){
      if (__lid_open && (start_time>__lid_open_time))  {
        __local_queue.shift();
        processServerQueue();
      }
    })
    .fail   ( function(xhr,err){
      if (__lid_open && (start_time>__lid_open_time))  {
        if (function_response && (!function_response(null)))
          MessageAJAXFailure(command_title,xhr,err);
      }
    });
  }

  return xhr;

}

function promptSessionCheck ( cmd )  {
  // resumes check loop after client wakes up from sleeping
  if (__current_page && (cmd!=fe_command.checkSession))  {
    let crTime = Date.now();
    if ((crTime-__last_session_check_time>5*__check_session_period))  {
      __last_session_check_time = crTime + 2*__check_session_period;
      makeSessionCheck ( __current_page.sceneId );
    }
  }
}

function serverCommand ( cmd,data_obj,page_title,function_response,
                         function_always,function_fail,timeout=1000000 )  {

  promptSessionCheck ( cmd );

  __server_queue.push ({
    status            : 'waiting',
    type              : 'command',
    id                : __server_queue_id++,
    request_type      : cmd,
    data_obj          : data_obj,
    t_requested       : performance.now(),
    timeout           : timeout,
    page_title        : page_title,
    function_response : function_response,
    function_always   : function_always,
    function_fail     : function_fail
  });

  __process_network_indicators();
  processServerQueue();

}


function serverRequest ( request_type,data_obj,page_title,function_ok,
                         function_always,function_fail,timeout=1000000 )  {

  promptSessionCheck ( 'x' );

  __server_queue.push ({
    status          : 'waiting',
    type            : 'request',
    id              : __server_queue_id++,
    request_type    : request_type,
    data_obj        : data_obj,
    timeout         : timeout,
    t_requested     : performance.now(),
    page_title      : page_title,
    function_ok     : function_ok,
    function_always : function_always,
    function_fail   : function_fail
  });

  __process_network_indicators();
  processServerQueue();

}


function localCommand ( cmd,data_obj,command_title,function_response )  {

  promptSessionCheck ( 'x' );

  if (__local_service)  {
    __local_queue.push ({
      status            : 'waiting',
      // cmd               : cmd,
      request_type      : cmd,
      data_obj          : data_obj,
      command_title     : command_title,
      function_response : function_response
    });
    processLocalQueue();
  } else if (function_response)
    function_response(null);
}


function downloadFile ( uri )  {
let hiddenALinkID = 'hiddenDownloader';
let alink = document.getElementById(hiddenALinkID);
  if (!alink)  {
    alink    = document.createElement('a');
    alink.id = hiddenALinkID;
    alink.style.display = 'none';
    alink.type          = 'application/octet-stream';
    document.body.appendChild(alink);
  }
  alink.download = uri.split('/').pop();
  alink.href     = uri;
  alink.click();
}


// function calculateJobFileURL ( fileName )  {
//   // let url = __special_url_tag + '/';
//   // if (__login_token)
//   //       url += __login_token;
//   // else  url += '404';
//   // return url + '/' + __current_project + '/' + jobId + '/' + filePath;
// }

/*
function fetchJobFile ( task,fname,function_success,function_always,function_fail )  {
// task may be any task from the project; the actual task number is obtained from 'fname'

  let furl = task.getProjectURL ( parseInt(fname.split('-')[0],10),fname );

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
  oReq.timeout      = 9999999;
  oReq.open ( 'POST',furl,true );

  try {
    oReq.send(null);
  } catch (e) {
    if (function_fail)
      function_fail ( 'general error' );
    // alert ( 'loading ' + self.url + ' failed:\n' + e );
  }

}
*/


function fetchFile ( furl,function_success,function_always,function_fail )  {
// furl is relative file url starting from FE URL

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
    // alert ( 'loading ' + self.url + ' failed:\n' + e );
  }

}


function fetchJobFile ( task,fname,function_success,function_always,function_fail )  {
// task may be any task from the project; the actual task number is obtained from 'fname'
  fetchFile ( task.getProjectURL(parseInt(fname.split('-')[0],10),fname),
              function_success,function_always,function_fail );
}

function fetchJobOutputFile ( task,fname,function_success,function_always,function_fail )  {
// task may be any task from the project; the actual task number is obtained from 'fname'
  fetchFile ( task.getProjectURL(parseInt(fname.split('-')[0],10),'output/'+fname),
              function_success,function_always,function_fail );
}


function getJobFileURL ( jobId,filePath )  {
  let url = __special_url_tag + '/';
  if (__login_token)
        url += __login_token;
  else  url += '404';
  return url + '/' + __current_project + '/' + jobId + '/' + filePath;
}


function downloadJobFile ( jobId,filePath )  {
  /*
  let url = __special_url_tag + '/';
  if (__login_token)
        url += __login_token;
  else  url += '404';
  url += '/' + __current_project + '/' + jobId + '/' + filePath;
  downloadFile ( url );
  */
  downloadFile ( getJobFileURL(jobId,filePath) );
}

/*  commented on 17.07.2020
window.onbeforeunload = function(e)  {
  serverCommand ( fe_command.stop,{},'stopping',null,null,function(){} );
}
*/


/*
function setQuitDestructor()  {

  window.addEventListener('beforeunload', function (e) {
    // Cancel the event as stated by the standard.
    e.preventDefault();
    // Chrome requires returnValue to be set.
    e.returnValue = '';
    alert ( 'unload' );
    //localCommand  ( nc_command.stop,{},'stopping',function(){} );
    serverCommand ( fe_command.stop,{},'stopping',function(response){
      alert ('response');
    },null,function(){} );
    return true;
  });

}
*/


//  ===========================================================================
//  Service functions for communication with iframes

var __comm_iframes = {};

function setCommunicatingIFrame ( holder,iframe )  {
let fid0 = 'fid_' + Date.now();
let fid  = fid0;
let k    = 0;
  while (fid in __comm_iframes)
    fid = fid0 + '_' + k++;
  __comm_iframes[fid] = { 
    'holder' : holder,
    'iframe' : iframe,
    'data'   : { 'was_output' : false }  // no output from job initially
  };
  return fid;
}

function setCommunicationFrameData ( fid,dataName,data )  {
  if (fid in __comm_iframes)
    __comm_iframes[fid].data[dataName] = data;
}

function getCommunicationFrameData ( fid,dataName )  {
  if (fid in __comm_iframes)
    return __comm_iframes[fid].data[dataName];
  return null;
}

function removeCommunicatingIFrame ( fid )  {
  if (fid in __comm_iframes)
    delete __comm_iframes[fid];
}

function removeAllCommunicatingIFrames()  {
  for (let fid in __comm_iframes)
    if (__comm_iframes.hasOwnProperty(fid))
      delete __comm_iframes[fid];
}

function getNofCommunicatingIFrames()  {
let c = 0;
  for (let p in __comm_iframes)
    if (__comm_iframes.hasOwnProperty(p))
      c++;
  return c;
}


function saveUserData ( title )  {
  let userData           = new UserData();
  userData.login         = __login_id;
  userData.pwd           = '';   // can save only some records without password
  delete userData.remote_login;  // do not update
  delete userData.remote_pwd;    // do not update
  userData.helpTopics    = __doNotShowList;
  userData.authorisation = __user_authorisation;
  userData.settings      = __user_settings;
  userData.remote_tasks  = __remote_tasks;
  serverRequest ( fe_reqtype.updateUserData,userData,
                  title,function(response){},null,'persist' );            
}


if (window.addEventListener) {
  window.addEventListener ( 'message', onWindowMessage, false );
} else if (window.attachEvent) {
  window.attachEvent ( 'onmessage', onWindowMessage, false );
} else 
  alert ( 'No Window messaging' );


function onWindowMessage ( event ) {
  // Check sender origin to be trusted
  // if (event.origin !== "http://example.com") return;

  // function _correct_name ( fname )  {  // because Moorhen makes it funny
  //   return fname.split(' ').join('_').split('#').join('');
  // }

  let edata = event.data;

  if (edata.command=='saveFiles')  {
    if (edata.files.length<=0)  {
      if ( __comm_iframes[edata.meta.fid].holder)
        __comm_iframes[edata.meta.fid].holder.close();
    } else  {
      let edata1 = {
        meta  : edata.meta,
        files : []
      }
      for (let i=0;i<edata.files.length;i++)  {
        if ('fpath' in edata.files[i])  {
          edata1.files.push ( edata.files[i] );
        } else  {
          edata1.files.push ({
            // fpath : _correct_name(edata.files[i].molName) + '.pdb',
            fpath : edata.files[i].molName + '.pdb',
            data  : edata.files[i].pdbData
          });
          edata1.files.push ({
            // fpath : _correct_name(edata.files[i].molName) + '.mmcif',
            fpath : edata.files[i].molName + '.mmcif',
            data  : edata.files[i].mmcifData
          });
        }
        edata1.files[edata1.files.length-1].isMRSearchModel =
                            ('isMRSearchModel' in edata.files[i]) && 
                            edata.files[i].isMRSearchModel;
      }
      serverRequest ( fe_reqtype.saveJobFiles,edata1,'Save job file',
        function(rdata){
          if (rdata.project_missing)  {
            new MessageBox (  'Project not found',
                              '<div style="width:350px"><h3>Project "' + edata.meta.project +
                              '" is not found on server</h3>' +
                              '<i>This is a bug, please report</i>.</div>',
                              'msg_error'
                            );
          } else if (edata.confirm=='model')  {
          // if ('callback' in edata)
          //   edata.callback.postMessage ({ message: 'done!'} );
          // if (edata.meta.fid in __comm_iframes)
          //   alert ( ' >>>> ' + edata.meta.fid );
          // __comm_iframes[edata.meta.fid].iframe.getWindow().postMessage ({ message: 'done!'} );
            let flist = [];
            for (let i=0;i<edata.files.length;i++)
              if (!('report' in edata.files[i]) || edata.files[i].report)  {
                if ('fpath' in edata.files[i])  {
                  flist.push ( edata.files[i].fpath );
                } else  {
                  flist.push ( edata.files[i].molName + '.pdb'   );
                  flist.push ( edata.files[i].molName + '.mmcif' );
                }
              }
            if (flist.length<=0)  {
              if ( __comm_iframes[edata.meta.fid].holder)
                __comm_iframes[edata.meta.fid].holder.close();
            } else  {
              // set up a flag that some output was created; unless it os set,
              // the job will be deleted automatically
              setCommunicationFrameData ( edata.meta.fid,'was_output',true );
              new MessageBoxF ( 'Model(s) saved',
                                '<div style="width:400px"><h3>Model(s) saved</h3>' +
                                'The following model(s) are saved on ' + appName() +':<p>' +
                                flist.join('<br>')  + '</div>',
                                'Exit Moorhen',function(){
                                  // __comm_iframes[edata.meta.fid].iframe.getWindow().postMessage ({
                                  //   message: 'done!'
                                  // });
                                  if ( __comm_iframes[edata.meta.fid].holder)
                                    __comm_iframes[edata.meta.fid].holder.close();
                                },false,'msg_ok'
                              );
              // new MessageBox (  'Current model saved',
              //                   '<div style="width:350px"><h3>Current model saved</h3>' +
              //                   'Current model saved in file "' + edata.fpath + 
              //                   '" on ' + appName() + '.</div>',
              //                   'msg_ok'
              //                 );
            }              
          } else if (edata.confirm=='manual')  {
            // making a backup does not count as making an output
            // setCommunicationFrameData ( edata.meta.fid,'was_output',true );
            new MessageBox ( 'Backup file written',
                             '<div style="width:350px"><h3>Backup file written</h3>' +
                             'Backup file saved in ' + appName() + 
                             ', use <i>"Recover molecule backup"</i> to retrieve.</div>',
                             'msg_ok'
                           );
          }
        },null,'persist' );
    }
  } else if (edata.command=='getFile')  {

      let req_data  = {};
      req_data.meta = {};
      req_data.meta.project = edata.meta.project;
      req_data.meta.id      = edata.meta.id;
      req_data.meta.file    = edata.fpath;

      serverRequest ( fe_reqtype.getJobFile,req_data,'Get job file',
                      function(data){
        __comm_iframes[edata.meta.fid].iframe.getWindow().postMessage ({
          postdata : edata,
          content  : data
          // message: 'done!'
        });
      },null,'persist');

  } else if (edata.command=='saveWebCootPreferences')  {

    __user_settings.webcoot_pref = edata.data;
    saveUserData ( 'WebCoot preferences update' );
    // let userData   = new UserData();
    // userData.login = __login_id;
    // userData.pwd   = '';  // can save only some records without password
    // __user_settings.webcoot_pref = edata.data;
    // userData.settings  = __user_settings;
    // serverRequest ( fe_reqtype.updateUserData,userData,
    //                 'WebCoot preferences update',function(response){} );

  }

//      console.log ( 'Unknown windows message command: ' + edata.command );

    // alert ( JSON.stringify(data) );

    // if (typeof(window[data.func]) == "function") {
    //     window[data.func].call(null, data.message);
    // }
}

var remote_jobs_server_code = {
  not_configured : 'not_configured',  // url not configured
  not_accessible : 'not_accessible',  // no valid response from remote jobs server  
  not_connected  : 'not_connected',   // no user credentials
  not_responding : 'not_responding',  // wrong remote credentials
  ok             : 'ok'
};

function getRemoteFEStatus()  {
  if (!__remoteJobServer.url)
    return remote_jobs_server_code.not_configured;
  if (__remoteJobServer.status!='FE')
    return remote_jobs_server_code.not_accessible;
  // if ((!__remote_login_id) || (!__remote_pwd))
  if (__remote_environ_server.length<=0)
    return remote_jobs_server_code.not_connected;
  if (__remote_environ_server.length<=0)
    return remote_jobs_server_code.not_responding;
  return remote_jobs_server_code.ok;
}

function getRemoteFEStatusMessage()  {
  let msg = '';
  switch (getRemoteFEStatus())  {
    case remote_jobs_server_code.not_configured :
        msg = 'The connection to the remote server is not configured. ' +
              'Please set up the remote server URL using the ' + appName() +
              ' configuration utility and enter your credentials (login ' +
              'name and password) in Settings.'; 
      break;
    case remote_jobs_server_code.not_accessible :
        msg = 'The remote server is not accessible. This could be due to ' +
              'an incorrect server URL (please configure it using the ' +
              appName() + ' configuration utility) or issues with your ' +
              'internet connection.';
      break;
    case remote_jobs_server_code.not_connected  :
        msg = 'To run jobs on the remote server, please enter your user ' +
              'credentials (login name and password) in Settings.';
      break;
    case remote_jobs_server_code.not_responding :
        msg = 'The remote server is not connected, likely due to incorrect ' +
              ' or no user credentials (login name or password) ' +
              'specified in Settings.';
        break;
    default : ;
  }
  return msg;
}