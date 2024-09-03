#!/usr/bin/env bash
# allows copying files to and from nextcloud
# requires NEXTCLOUD_TOKEN, NEXTCLOUD_USER, NEXTCLOUD_URL to be set

# TODO:
# - recursive copy of folders
#   (need to track base folder and mkdirs)
# - other wildcards than trailing (/*)

# check dependencies
if ! command -v curl &> /dev/null; then
  echo "curl not found"
  exit 1
fi
if ! command -v grep &> /dev/null; then
  echo "grep not found"
  exit 1
fi
if ! command -v basename &> /dev/null; then
  echo "basename not found"
  exit 1
fi
if ! command -v dirname &> /dev/null; then
  echo "dirname not found"
  exit 1
fi

# check environment variables
if [ -z "$NEXTCLOUD_TOKEN" ]; then
  echo "NEXTCLOUD_TOKEN not set"
  exit 1
fi
if [ -z "$NEXTCLOUD_USER" ]; then
  echo "NEXTCLOUD_USER not set"
  exit 1
fi
if [ -z "$NEXTCLOUD_URL" ]; then
  echo "NEXTCLOUD_URL not set"
  exit 1
fi

# check parameter count
if [ "$#" -lt 2 ]; then
  echo "Usage: ncp [nc:]<file> [nc:]<folder>"
  echo ""
  echo "Path starting with nc: is a nextcloud path."
  echo ""
  echo "Wildcards are supported, for Nextcloud paths"
  echo "only a trailing wildcard (/*) is supported."
  echo "Nextcloud wildcards need to be enclosed in quotes."
  exit 1
fi

check_nc_path() {
  nc_path=$(urlencode "$1")
  prop_description=$(curl -s -H "Authorization: Bearer $NEXTCLOUD_TOKEN" \
    -X PROPFIND \
    "$NEXTCLOUD_URL/remote.php/dav/files/$NEXTCLOUD_USER/$nc_path")
  if [[ "$prop_description" == *"404 Not Found"* ]]; then
    return 0
  elif [[ "$prop_description" == *"d:collection"* ]]; then
    return 1
  else
    return 2
  fi
}

put_file() {
  check_nc_path "$2"
  path_type=$?
  if [ $path_type -eq 1 ]; then # folder
    file_name=$(basename "$1")
    file_name="/$file_name"
  fi
  nc_path=$(urlencode "$2$file_name")
  curl -H "Authorization: Bearer $NEXTCLOUD_TOKEN" \
    --progress-bar \
    -X PUT --data-binary \
    @"$1" \
    "$NEXTCLOUD_URL/remote.php/dav/files/$NEXTCLOUD_USER/$nc_path" > /dev/null
}

put_files() {
  for file in $1; do
    if [ -f "$file" ]; then
      echo "$file"
      put_file "$file" "$2"
    else
      echo "Skipping folder $file"
    fi
  done
}

get_file() {
  if [ -d "$2" ]; then
    file_name=$(basename "$1")
    file_name="$2/$file_name"
  else
    file_name="$2"
  fi
  #TODO: recursive mkdirs
  #mkdirs=$(dirname "$2$filename")
  nc_path=$(urlencode "$1")
  curl -H "Authorization: Bearer $NEXTCLOUD_TOKEN" \
    --progress-bar \
    -X GET \
    "$NEXTCLOUD_URL/remote.php/dav/files/$NEXTCLOUD_USER/$nc_path" > "$file_name"
}

get_files() {
  # get wildcards (e.g. MyFiles/*) from input and download each file
  if [[ "$1" == *"/*" ]]; then
    nc_path=$(urlencode "${1%/*}")
    folder_content=$(curl -s -H "Authorization: Bearer $NEXTCLOUD_TOKEN" \
      -X PROPFIND \
      "$NEXTCLOUD_URL/remote.php/dav/files/$NEXTCLOUD_USER/$nc_path")
    if [[ "$folder_content" == *"d:collection"* ]]; then
      files=$(echo "$folder_content" | grep -oPm1 "(?<=<d:href>)[^<]+")
      # first file is the folder itself, remove first line
      files=$(echo "$files" | tail -n +2)
      for file in $files; do
        # remove the nextcloud path (/remote.php/dav/files/$NEXTCLOUD_USER)
        file="${file#*/$NEXTCLOUD_USER}"
        get_files "$file" "$2"
      done
    else
      echo "Folder $1 not found in cloud"
    fi
  else
    check_nc_path "$1"
    is_folder=$?
    if [ $is_folder -eq 1 ]; then # folder
      echo "Skipping folder $1"
      # TODO: recursively get all files in the folder
      # remove the last character if it is a /
      #if [[ "$1" == */ ]]; then
        #get_files "${1%?}" "$2"
      #else
        #get_files "$1/*" "$2"
      #fi
    elif [ $is_folder -eq 2 ]; then # file
      echo "$1"
      # download the file
      get_file "$1" "$2"
    elif [ $is_folder -eq 0 ]; then # not found
      echo "File $1 not found in cloud"
    else
      echo "File $1 unknown error"
    fi
  fi
}

urlencode() {
  old_lc_collate=$LC_COLLATE
  LC_COLLATE=C
  local length="${#1}"
  for (( i = 0; i < length; i++ )); do
    local c="${1:i:1}"
    case $c in
      [a-zA-Z0-9.~_-//]) printf "$c" ;;
      *) printf '%%%02X' "'$c" ;;
    esac
  done
  LC_COLLATE=$old_lc_collate
}

first_params="${@:1:$(($#-1))}"
last_parm="${@: -1}"
if [[ "$first_params" == "nc:"* ]]; then
  nextcloud_path="${first_params:3}"
  local_path="$last_parm"
  get_files "$nextcloud_path" "$local_path"
elif [[ "$last_parm" == "nc:"* ]]; then
  nextcloud_path="${last_parm:3}"
  local_path="$first_params"
  put_files "$local_path" "$nextcloud_path"
fi
