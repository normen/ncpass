#!/usr/bin/env -S node -r esm
'use strict';
import { PasswordsClient, Password } from 'passwords-client';
// get version from package.json
import { version } from './package.json';

// get login data from environment
const server_url = process.env.NEXTCLOUD_URL;
const server_user = process.env.NEXTCLOUD_USER;
const server_token = process.env.NEXTCLOUD_TOKEN;

if(!server_url || !server_user || !server_token){
  console.error('Missing environment variables!');
  console.error('Need NEXTCLOUD_URL, NEXTCLOUD_USER and NEXTCLOUD_TOKEN');
  process.exit(1);
}

const api = new PasswordsClient({
  baseUrl: server_url + "/",
  user: server_user,
  token: server_token
});

const folderRepository = api.getFolderRepository();
const passwordsRepository = api.getPasswordRepository();

// parse command line arguments
let args = process.argv.slice(2);
let command = args[0];
let in_label = args[1];
// get user/password from args 2 and 3, depending on the argument count (1 = pass, 2= user/pass)
let in_user = '';
let in_pass = '';

// get all option parameters and their values (e.g. --url my_url) in separate array and remove them from the args array
let options = {};
for (let i = 0; i < args.length; i++){
  if(args[i].startsWith('--')){
    let key = args[i].substring(2);
    let val = args[i+1];
    options[key] = val;
    args.splice(i, 2);
  }
}

// execute the command
switch(command){
  case 'set':
    if(!in_label){
      console.error('missing arguments! at least label is required');
      process.exit(1);
    }
    // get user/password from args 2 and 3, depending on the argument count (1 = pass, 2= user/pass)
    switch(args.length){
      case 3:
        in_pass = args[2];
        in_user = '';
        break;
      case 4:
        in_user = args[2];
        in_pass = args[3];
        break;
      default:
        break;
    }
    getExisting(in_label, in_user).then((pass) => {
      if(in_pass)
        pass.setPassword(in_pass);
      else if(!pass.getId())
        throw 'missing arguments! at least label and password is required';
      updateGenerate(pass, false);
    }).catch((err) => {
      console.error('Error: ' + err);
    });
    break;
  case 'getuser':
    if(!in_label){
      console.error('missing arguments! at least label is required');
      process.exit(1);
    }
    getUser(in_label).then((res) => console.log(res));
    break;
  case 'get':
  case 'getpass':
    if(!in_label){
      console.error('missing arguments! at least label is required');
      process.exit(1);
    }
    if(args.length == 3){
      in_user = args[2];
      getPass(in_label, in_user).then((res) => console.log(res));
    } else {
      getPass(in_label).then((res) => console.log(res));
    }
    break;
  case 'gen':
  case 'generate':
    if(!in_label){
      console.error('missing arguments! at least label is required');
      process.exit(1);
    }
    // generate a password
    switch(args.length){
      case 2:
        in_user = '';
        break;
      case 3:
        in_user = args[2];
        break;
      default:
        break;
    }
    const new_pass = generatePassword();
    getExisting(in_label, in_user).then((gen_pass) => {
      gen_pass.setPassword(new_pass);
      updateGenerate(gen_pass);
    }).catch((err) => {
      console.error('Error: ' + err);
    });
    break;
  case 'del':
  case 'delete':
    if(!in_label){
      console.error('missing arguments! at least label is required');
      process.exit(1);
    }
    // generate a password
    switch(args.length){
      case 2:
        in_user = '';
        break;
      case 3:
        in_user = args[2];
        break;
      default:
        console.error('missing arguments! at least label is required');
        process.exit(1);
        break;
    }
    getExisting(in_label, in_user).then((gen_pass) => {
      if(gen_pass.getId()){
        passwordsRepository.delete(gen_pass).then((res) => {
          console.error('Deleted: ', gen_pass.getLabel(), gen_pass.getUserName());
        }).catch((err) => {
          console.error('Error: ' + err);
        });
      } else {
        console.error('Password not found: ', gen_pass.getLabel(), gen_pass.getUserName());
      }
    }).catch((err) => {
      console.error('Error: ' + err);
    });
    break;
  case 'list':
    findPasses();
    break;
  default:
    console.error('NCPass v' + version);
    console.error('');
    console.error('Usage: ncpass <command> <label> <user> <password> [options]');
    console.error('');
    console.error('Commands: set, get, getuser, generate, delete, list');
    console.error('Options: --url <url>, --notes <notes>, --folder <folder>, --username <username>, --password <password>');
    break;
  case '-h':
  case '--help':
    console.error('Examples:');
    console.error('');
    console.error('Generate a pass and store it:');
    console.error('ncpass generate my_pass_name');
    console.error('');
    console.error('Generate a pass and store it with username and url:');
    console.error('ncpass generate my_pass_name username --url my_url');
    console.error('');
    console.error('Get password by label (optionally also by username)');
    console.error('ncpass get my_pass_name');
    console.error('ncpass get my_pass_name username');
    console.error('');
    console.error('Set a password (optionally with username)');
    console.error('ncpass set my_pass_name password');
    console.error('ncpass set my_pass_name username password');
    console.error('');
    console.error('Set parameters for an existing password (url, notes, folder)');
    console.error('ncpass set my_pass_name --url my_url --notes my_notes --folder my_folder');
}

function updateGenerate(password, show = true){
  if(!password.getId()) {
    passwordsRepository.create(password).then((res) => {
      if(show) console.log(res.getPassword());
      //console.error("Created: ", res.getLabel());
    }).catch((err) => {
      console.error('Error: ' + err);
    });
  } else {
    passwordsRepository.update(password).then((res) => {
      if(show) console.log(res.getPassword());
      //console.error("Updated: ", res.getLabel());
    }).catch((err) => {
      console.error('Error: ' + err);
    });
  }
}

async function getExisting(label, user = ''){
  let passwordCollection = await passwordsRepository.findAll();
  // show all in collection
  var ret = new Password();
  ret.setLabel(label);
  if(user)
    ret.setUserName(user);
  for (let password of passwordCollection) {
    if(password.getLabel() == label) {
      if(user == ''){
        ret = password;
        break;
      }
      else if(password.getUserName() == user) {
        ret = password;
        break;
      }
    }
  }
  if(options.url)
    ret.setUrl(options.url);
  if(options.notes)
    ret.setNotes(options.notes);
  if(options.username)
    ret.setUserName(options.username);
  if(options.password)
    ret.setPassword(options.password);
  if(options.folder){
    const id = await getFolderId(options.folder);
    if(id)
      ret.setFolder(id);
    else
      console.error('Folder not found: ', options.folder);
  }
  return ret;
}

async function getUser(label){
  let passwordCollection = await passwordsRepository.findAll();
  // show all in collection
  for (let password of passwordCollection) {
    if(password.getLabel() == label)
      return password.getUserName();
  }
  return '';
}

async function getPass(label, user = ''){
  let passwordCollection = await passwordsRepository.findAll();
  // show all in collection
  for (let password of passwordCollection) {
    if(password.getLabel() == label) {
      if(user == '')
        return password.getPassword();
      else if(password.getUserName() == user)
        return password.getPassword();
    }
  }
  return '';
}

async function findPasses(){
  let passwordCollection = await passwordsRepository.findAll();
  // show all in collection
  for (let password of passwordCollection) {
    console.log(password.getLabel(),password.getUserName());
  }
}

async function getFolderId(name) {
  const folders = await folderRepository.findAll()
  if(name === 'Home')
    return "00000000-0000-0000-0000-000000000000";
  for (let folder of folders) {
    if (folder.getLabel() === name) {
      return folder.getId();
    }
  }
  return null;
}

function generatePassword(){
  // generate a password like xxxxx-xxxxx-xxxxx-xxxxx
  let password = '';
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < 20; i++) {
    if(i % 5 == 0 && i != 0)
      password += '-';
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
