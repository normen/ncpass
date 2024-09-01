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
  curl -s -H "Authorization: Bearer $NEXTCLOUD_TOKEN" \
    -X PROPFIND \
    "$NEXTCLOUD_URL/remote.php/dav/files/$NEXTCLOUD_USER/$1" | grep -q "404 Not Found"
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
  echo "Putting $2$file_name.."
  curl -H "Authorization: Bearer $NEXTCLOUD_TOKEN" \
    --progress-bar \
    -X PUT --data-binary \
    @"$1" \
    "$NEXTCLOUD_URL/remote.php/dav/files/$NEXTCLOUD_USER/$2$file_name" > /dev/null
}

get_file() {
  if [ -d "$2" ]; then
    file_name=$(basename "$1")
    file_name="/$file_name"
  fi
  curl -H "Authorization: Bearer $NEXTCLOUD_TOKEN" \
    --progress-bar \
    -X GET \
    "$NEXTCLOUD_URL/remote.php/dav/files/$NEXTCLOUD_USER/$1" > "$2$file_name"
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
