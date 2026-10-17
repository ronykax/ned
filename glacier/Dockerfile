FROM debian:stable-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PIP_BREAK_SYSTEM_PACKAGES=1

RUN apt-get update
RUN apt-get install -y curl wget git jq ripgrep fd-find unzip zip build-essential
RUN apt-get install -y python3 python3-pip python3-venv
RUN apt-get install -y nodejs npm

WORKDIR /workspace
CMD ["sleep", "infinity"]