<p align="center" style="margin-top: 12px">
  <a href="https://splitpro.app">
  <img width="100px"  style="border-radius: 50%;" src="https://splitpro.app/logo_circle.png" alt="SplitPro Logo">
  </a>

  <h1 align="center">SplitPro</h1>
  <h2 align="center">An open source alternative to Splitwise</h2>

<p align="center">
    <a href="https://splitpro.app"><strong>To our App »</strong></a>
    <br />
    <br />
  </p>
</p>

## About

SplitPro aims to provide an open-source way to share expenses with your friends.

It's meant to be a complete replacement for Splitwise.

It currently has most of the important features.

- Add expenses with an individual or groups
- Overall balances across the groups
- Multiple currency support
- Upload expense bills
- PWA support
- Split expense unequally (share, percentage, exact amounts, adjustments)
- Push notification
- Download your data
- Import from splitwise

**More features coming every day**

---

## Why

Splitwise is one of the best apps to add expenses and bills.

I understand that every app needs to make money, After all, lots of effort has been put into Spliwise. My main problem is how they implemented this.

Making pro features or asking money to remove ads is fine, But asking money for adding Expenses (Core feature) is frustrating.

I was searching for other open-source alternatives (Let's be honest, any closed-source product might do the same and I don't have any reason to believe otherwise).

I managed to find a good app [spliit.app](https://spliit.app/) by [Sebastien Castiel](https://scastiel.dev/) but it's not a complete replacement and didn't suit my workflow sadly. Check it out to see if it fits you.

_That's when I decided to work on this_

## Tech stack

- [NextJS](https://nextjs.org/)
- [Tailwind](https://tailwindcss.com/)
- [tRPC](https://trpc.io/)
- [ShadcnUI](https://ui.shadcn.com/)
- [Prisma](https://www.prisma.io/)
- [Postgres](https://www.postgresql.org/)
- [NextAuth](https://next-auth.js.org/)

## Getting started.

### Prerequisites

- Node.js (Version: >=18.x)
- PostgreSQL
- pnpm (recommended)

## Self Hosting
### Prerequisites
- Docker
- Docker compose plugin
- .env file with all the required secrets and env vars (make sure to uncomment POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD)

### Instructions to deploy (it's just one command away)
```bash
docker compose build && docker compose up -d
```

### Domain setup, SSL certs and reverse proxy
### Prerequisites
- nginx
- certbot
- certbot nginx plugin
#### Nginx Guide for RedHat based systems (Fedora, RHEL, CentOS etc)
Add a new conf file to your nginx configuration for this application
```bash
sudo cp ./splitpro-nginx.conf /etc/nginx/conf.d/
```
Validate the new config
```bash
sudo nginx -t
```
If everything looks good, you can go ahead and restart nginx to reflect the new config (You can also reload it but I prefer restart)
```bash
sudo systemctl restart nginx
```
Now let's install certbot to request a free SSL cert from letsencrypt
```bash
sudo dnf install -y certbot python3-certbot-nginx
```
Request the certificate
```bash
sudo certbot --nginx -d splitpro.domain.com
```
and that's it!

## Setup Backups
### Prerequisites
- mutt (install and configure, see instructions here https://www.makeuseof.com/install-configure-mutt-with-gmail-on-linux/)
- crontab

Create a folder called as `.bps` in root's home dir
```bash
mkdir /root/.bps
```

*Update the script.sh to have your own target email address instead of `target@email.com`*

Copy the backup script into `.bps` location
```bash
cp ./backup/script.sh /root/.bps/
```

Add the cron job in the crontab
```bash
crontab ./backup/crontab.txt
```

### Run locally

- Copy .env.example to .env to the root directory and add the required env variables.
- R2 related env is for cloudflare R2 used to upload and can be set up [here](https://www.cloudflare.com/en-au/developer-platform/r2/)
- RESEND env could be obtained by creating a free account on [here](https://resend.com/)
- Run `pnpm install`
- Run `pnpm db:push` or `pnpm prisma:prod` to populate db migrations
- Run `pnpm dev`


## Sponsors

We are grateful for the support of our sponsors.

### Our Sponsors

<a href="https://hekuta.net/en" target="_blank">
  <img src="https://pbs.twimg.com/profile_images/1743758975026470912/MQ1U1bye_400x400.jpg" alt="hekuta" style="width:60px;height:60px;">
</a>
