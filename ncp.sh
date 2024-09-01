#!/usr/bin/env bash
# allows copying files to and from nextcloud
# requires NEXTCLOUD_TOKEN, NEXTCLOUD_USER, NEXTCLOUD_URL to be set

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
  echo "Usage: $0 [nc:<file>] [nc:<folder>]"
  echo "Path starting with nc: is a nextcloud path"
  exit 1
fi

check_nc_folder_exists() {
  nc_path=$(urlencode "$1")
  curl -s -H "Authorization: Bearer $NEXTCLOUD_TOKEN" \
    -X PROPFIND \
    "$NEXTCLOUD_URL/remote.php/dav/files/$NEXTCLOUD_USER/$nc_path" | grep -q "404 Not Found"
}

# TODO: use file name automatically if folder is given
put_file() {
  check_nc_folder_exists "$2"
  if [ $? -eq 0 ]; then
    echo "" >/dev/null
  else
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

get_file() {
  if [ -d "$2" ]; then
    file_name=$(basename "$1")
    file_name="/$file_name"
  fi
  nc_path=$(urlencode "$1")
  curl -H "Authorization: Bearer $NEXTCLOUD_TOKEN" \
    --progress-bar \
    -X GET \
    "$NEXTCLOUD_URL/remote.php/dav/files/$NEXTCLOUD_USER/$nc_path" > "$2$file_name"
}

urlencode() {
  # urlencode <string>
  old_lc_collate=$LC_COLLATE
  LC_COLLATE=C
  local length="${#1}"
  for (( i = 0; i < length; i++ )); do
    local c="${1:i:1}"
    case $c in
      [a-zA-Z0-9.~_-]) printf "$c" ;;
      *) printf '%%%02X' "'$c" ;;
    esac
  done
  LC_COLLATE=$old_lc_collate
}

# check which parameter starts with nc:
# - first parameter is the file to copy
# - second parameter is the destination
# - parameter starting with nc: is the nextcloud folder
if [[ "$1" == "nc:"* ]]; then
  NEXTCLOUD_PATH="${1:3}"
  LOCAL_PATH="$2"
  get_file "$NEXTCLOUD_PATH" "$LOCAL_PATH"
elif [[ "$2" == "nc:"* ]]; then
  NEXTCLOUD_PATH="${2:3}"
  LOCAL_PATH="$1"
  put_file "$LOCAL_PATH" "$NEXTCLOUD_PATH"
fi
