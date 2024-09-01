#!/usr/bin/env -S node -r esm
import { PasswordsClient, Password } from 'passwords-client';

// get login data from environment
const server_url = process.env.NEXTCLOUD_URL;
const server_user = process.env.NEXTCLOUD_USER;
const server_token = process.env.NEXTCLOUD_TOKEN;

if(!server_url || !server_user || !server_token){
  console.error('Missing environment variables!');
  console.error('Need NEXTCLOUD_URL, NEXTCLOUD_USER and NEXTCLOUD_TOKEN');
  process.exit(1);
}

if (process.argv.length < 3) {
  console.error('Usage: ncpass <command> <label> <user> <password>');
  console.error('Commands: set, get, getuser, generate, delete, list');
  process.exit(1);
}

const api = new PasswordsClient({
  baseUrl: server_url + "/",
  user: server_user,
  token: server_token
});

const passwordsRepository = api.getPasswordRepository();

// parse command line arguments
let args = process.argv.slice(2);
let command = args[0];
let in_label = args[1];
// get user/password from args 2 and 3, depending on the argument count (1 = pass, 2= user/pass)
let in_user = '';
let in_pass = '';

// execute the command
switch(command){
  case 'set':
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
        console.error('missing arguments! at least label and password is required');
        process.exit(1);
        break;
    }
    getExisting(in_label, in_user).then((pass) => {
      pass.setPassword(in_pass);
      updateGenerate(pass);
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
        console.error('missing arguments! at least label is required');
        process.exit(1);
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
  case 'delete':
    // TODO: first search for the label, then delete the password using the id
    break;
  case 'list':
    findPasses();
    break;
  default:
    console.error('invalid command');
}

function updateGenerate(password){
  if(!password.getId()) {
    passwordsRepository.create(password).then((res) => {
      console.log(res.getPassword());
    });
  } else {
    passwordsRepository.update(password).then((res) => {
      console.log(res.getPassword());
    });
  }
}

async function getExisting(label, user = ''){
  let passwordCollection = await passwordsRepository.findAll();
  // show all in collection
  for (let password of passwordCollection) {
    if(password.getLabel() == label) {
      if(user == '')
        return password;
      else if(password.getUserName() == user)
        return password;
    }
  }
  const ret = new Password();
  ret.setLabel(label);
  if(user)
    ret.setUserName(user);
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
