base="/root/.bps"
folder=$(date +%b-%d-%Y)
file=$(date +%H-%M-%S)

mkdir -p ${base}/${folder}

docker exec split-pro-pg pg_dump -U postgres -F p postgres > ${base}/${folder}/${file}.sql

echo "Splitpro backup on ${folder}" | mutt -s "Splitpro backup ${folder}" target@email.com -a ${base}/${folder}/${file}.sql
