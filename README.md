# Secrets.js

This is a small Node.js script for sharing secrets securely. A big goal is to be small enough that
one can read and understand every line of it quickly. It currently stands at 72 lines, all in the
file `secrets.js`, with no dependencies (other than Node's standard libraries).

## Usage:

```
./secrets genkey MYKEY  # produces MYKEY.priv and MYKEY.pub
./secrets encrypt RECIPIENT_KEY.pub
./secrets decrypt MYKEY.priv
```

Make a key pair with `secrets genkey MYKEY`, send the public part to the person who has the credentials you want.

```
$ node secrets.js genkey grist-transfer
Generated key into grist-transfer.priv and grist-transfer.pub
```

That person will then encrypt a (small) file to send to you with the desired credential:

```
$ node secrets.js encrypt grist-transfer.pub < msg.txt > to_send.txt
```

Once you receive a file, decode it using your private key:

```
$ node secrets.js decrypt grist-transfer.priv < to_send.txt > msg.txt
```

Done!
