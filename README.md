# rally2gpx
Take rally stages and export them to GPX

```
$ docker run --rm -it -v ./data:/app/data crazyfacka/rally2gpx https://www.rally-maps.com/Rally-de-Portugal-2019

=====================================================================

Downloading and parsing data from 'https://www.rally-maps.com/Rally-de-Portugal-2019'
Found 16 tracks
? What stage do you wish to generate the GPX (Use arrow keys)
❯ Shakedown (Paredes)
  SS 8+11 - Vieira do Minho
  Service Park (Exponor)
  SS 1+4 - Lousã
  SS 15+18 - Fafe
  SS 16 - Luílhas
  Ceremonial Finish (Matosinhos)
(Move up and down to reveal more choices)

=====================================================================

Downloading and parsing data from 'https://www.rally-maps.com/Rally-de-Portugal-2019'
Found 16 tracks
? What stage do you wish to generate the GPX SS 15+18 - Fafe
? Output GPX filename (fafe.gpx)

=====================================================================

Downloading and parsing data from 'https://www.rally-maps.com/Rally-de-Portugal-2019'
Found 16 tracks
? What stage do you wish to generate the GPX SS 15+18 - Fafe
? Output GPX filename fafe.gpx
fafe.gpx has been saved
```

## Build

You can use docker for that.

```
$ docker build -t <image_name> .
```

## Run

As seen above in the description.
You have a Docker image available @ https://hub.docker.com/r/crazyfacka/rally2gpx