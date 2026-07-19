---
title: 핸드폰에서 PC WSL의 Claude Code를 원격으로 조종하는 법 — Tailscale, SSH, tmux
date: 2026-07-19
tags: [원격접속, Tailscale, SSH, tmux, WSL, Claude Code]
description: 핸드폰 SSH 앱으로 PC(WSL)의 Claude Code 세션에 접속해 이어서 작업하는 원격 환경을 구축한 과정. Tailscale·SSH·Termius·tmux가 각각 어떤 역할을 하는지, 그리고 WSL 인스턴스가 유휴 상태로 꺼지는 함정을 어떻게 피했는지 정리했다.
---

## 왜 이런 게 필요했나

이 블로그와 웹앱들은 전부 PC(Windows, WSL2 Ubuntu) 안에서 Claude Code와 대화하며 만든다. 문제는 항상 PC 앞에 앉아있을 수는 없다는 것이다. 이동 중이거나 소파에 누워있을 때 갑자기 아이디어가 떠오르거나, PC에서 시작한 작업을 잠깐 자리를 비운 사이에도 이어서 보고 싶을 때가 있다.

그래서 핸드폰에서 PC의 Claude Code 세션에 접속해 **그 자리에서 이어서 대화하고 파일을 고치고 커밋까지 할 수 있는** 원격 환경을 만들었다. 공유기 포트포워딩이나 공인 IP 노출 없이, 앱 세 개(Tailscale, Termius)와 리눅스 도구 하나(tmux)만으로 구성된다.

## 전체 그림 먼저 — 4단계 체인

핸드폰에서 Claude Code까지 도달하려면 아래 네 단계를 순서대로 통과해야 한다.

```
[핸드폰]
   │  ① Tailscale — 안전한 사설망 경로를 뚫는다
   ▼
[PC(WSL)의 가상 IP]
   │  ② SSH(를 Termius가 사용) — 인증하고 원격 셸을 연다
   ▼
[PC 안의 로그인 셸]
   │  ③ tmux attach — 미리 살려둔 작업 세션에 화면을 연결한다
   ▼
[tmux 세션 'main']
   │  ④ claude 실행
   ▼
[Claude Code와 대화 재개]
```

이 네 단계가 각각 다른 문제를 해결한다는 걸 이해하면 전체 구조가 훨씬 명확해진다. 하나씩 보자.

## ① Tailscale — 길을 뚫는다

Tailscale은 **핸드폰과 PC를 같은 가상 사설망(tailnet)으로 묶어주는 VPN 앱**이다. WireGuard라는 검증된 암호화 프로토콜 위에서 동작한다.

핵심은 이거다 — 원래 핸드폰에서 집 PC로 직접 접속하려면 공유기에 포트포워딩을 뚫거나 공인 IP를 노출해야 하는데, 둘 다 보안 리스크가 크다. Tailscale은 이 과정을 건너뛰고, 로그인만 같은 계정으로 하면 두 기기에 `100.x.x.x` 대역의 **가상 IP**를 하나씩 부여해서 서로 직접(또는 Tailscale의 중계 서버를 거쳐) 암호화 터널로 연결해준다.

이 IP는 인터넷상의 공인 고정 IP가 아니라 tailnet 안에서만 통하는 주소다. 예를 들면:

| 기기 | tailnet IP |
|---|---|
| PC (WSL, 호스트명 `white`) | `100.122.38.38` |
| 핸드폰 (`s24`) | `100.114.237.69` |

Tailscale이 하는 일은 딱 여기까지다 — **"핸드폰이 PC에 안전하게 닿을 수 있는 길을 뚫어주는 것"**. 로그인이나 터미널 기능은 없다.

## ② SSH — 인증하고 통로를 여는 프로토콜

SSH(Secure Shell)는 "인증 방식"이라기보다 **원격 컴퓨터에 안전하게 로그인해서 명령을 실행할 수 있게 해주는 통신 프로토콜**이다. 두 가지를 동시에 한다.

1. **암호화 채널** — 주고받는 로그인 정보, 명령어, 화면 출력을 전부 암호화해서 중간에서 못 엿듣게 한다
2. **인증 + 셸 접속** — 계정(`hugok`)으로 로그인해도 되는지 확인(비밀번호 또는 키)하고, 통과하면 그 계정의 셸(터미널)을 원격으로 열어준다

PC 쪽에는 `openssh-server`를 설치하고 `sshd`를 22번 포트에서 리스닝하도록 띄워두면 된다.

```bash
sudo apt install -y openssh-server
sudo service ssh start
```

Tailscale이 뚫어준 가상 IP(`100.122.38.38`)로 이 22번 포트에 접속하는 것이 SSH의 역할이다.

## ③ Termius — 그 통로로 실제 세션을 여는 앱

Termius는 핸드폰에서 쓰는 **SSH 클라이언트 앱**이다. Tailscale이 만든 IP를 목적지로 입력하고, 계정 정보로 로그인해서 실제 셸 세션을 여는 게 이 앱의 역할이다.

접속 정보는 단순하다.

- Host: `100.122.38.38` (Tailscale IP)
- Port: `22`
- User: `hugok`

정리하면 **Tailscale = 길을 뚫는 것, SSH = 그 길 끝의 정문이자 출입증 검사, Termius = 정문 앞까지 가서 실제로 문을 여는 손**이라고 비유할 수 있다.

## ④ tmux — 접속이 끊겨도 작업을 살려두는 그릇

여기까지만 하면 한 가지 문제가 남는다. SSH로 접속해서 터미널에 `claude`를 띄웠는데, 핸드폰 화면이 꺼지거나 앱이 종료되어 SSH 연결이 끊기면 — 그 SSH 세션에 딸려있던 셸 프로세스(`claude` 포함)도 통째로 죽어버린다. 다시 접속하면 처음부터 다시 시작해야 한다.

tmux(terminal multiplexer)는 이 문제를 해결한다.

- PC(WSL) 안에 `main`이라는 이름의 **가상 터미널 세션**을 하나 만들어두고, `claude`는 그 세션 "안"에서 실행된다
- SSH로 들어와서 하는 `tmux attach -t main`은 이미 돌고 있는 세션에 **화면만 하나 연결(attach)** 하는 것이다
- SSH 연결이 끊기면 화면 연결만 사라질 뿐(detach 상태가 됨), 세션 안의 프로세스는 tmux 서버가 살아있는 한 계속 실행된다
- 나중에 다시 SSH로 들어와 `tmux attach -t main`을 치면, 끊기기 전 화면 그대로(스크롤백 포함) 다시 연결된다

이 세션 이름(`main`)은 그 PC의 tmux 서버 안에서만 의미 있는 로컬 식별자다. 인터넷 어디서나 통하는 전역 ID가 아니라, 반드시 먼저 그 PC에 SSH로 로그인해야만 접근할 수 있다.

```bash
tmux new -s main       # 세션 최초 생성
tmux attach -t main    # 이미 있는 세션에 재접속
```

## PC(WSL) 쪽 구성

정리하면 PC 쪽에 필요한 구성 요소는 다음과 같다.

- `tmux` — apt로 설치 (이 환경엔 Homebrew가 없어서 brew 대신 apt 사용)
- `tailscale` — 공식 저장소를 apt로 등록해 설치 (`curl | sh` 파이프 실행은 보안 정책상 막혀 있어서, gpg 키와 저장소 파일을 `tee`로 내려받는 방식을 썼다)
- `openssh-server` — `sshd` 22번 포트 리스닝
- **tmux `main` 세션 상시 유지** — systemd 유닛(`tmux-main.service`)을 등록해서, WSL이 부팅될 때마다 `main` 세션이 없으면 자동으로 만들어지도록 했다

```ini
[Unit]
Description=Persistent tmux session "main"
After=network.target

[Service]
Type=oneshot
RemainAfterExit=yes
User=hugok
WorkingDirectory=/home/hugok
ExecStart=/bin/sh -c '/usr/bin/tmux new-session -d -s main || true'
ExecStop=/usr/bin/tmux kill-session -t main

[Install]
WantedBy=multi-user.target
```

## 폰 쪽 구성

- **Tailscale 앱** — PC와 같은 계정으로 로그인해 같은 tailnet에 등록
- **Termius(SSH 클라이언트)** — Tailscale IP·포트·계정 정보를 저장해두고 탭 한 번으로 접속

## 실제 접속 흐름

1. 핸드폰에서 Tailscale 앱이 tailnet에 연결되어 있는지 확인
2. Termius로 `100.122.38.38:22` 접속, `hugok` 계정 로그인
3. 접속되면 `tmux attach -t main`
4. PC에서 미리 띄워뒀거나, 없으면 새로 `claude` 실행
5. 이후로는 핸드폰 화면이 곧 PC의 터미널 — 대화하고, 코드 고치고, git 커밋·푸시까지 그대로 가능

PC에서 이미 `claude`를 띄워둔 상태라면 핸드폰에서 같은 세션에 붙어 그대로 이어받을 수 있다. 양방향이라 PC와 핸드폰이 번갈아가며 같은 작업을 들여다볼 수 있다.

## 겪었던 함정 — WSL 인스턴스가 유휴 상태로 꺼진다

Windows 로그온 시점에 WSL을 자동으로 깨워서 `sshd`·`tailscaled`·`tmux-main.service`가 뜨게 하려고, Windows 작업 스케줄러에 로그온 트리거로 `wsl.exe -d Ubuntu -e /bin/true`를 등록했었다. 그런데 이 명령은 실행되자마자 끝나버려서 `wsl.exe` 프로세스가 곧바로 종료된다.

문제는 WSL 배포판 인스턴스가 **"붙어있는 클라이언트가 하나도 없으면" 유휴로 판단해 통째로 내려가고, 다음에 뭔가 다시 붙을 때(VSCode 재연결 등) 처음부터 재시작**한다는 점이었다. 이 재시작 순간에 SSH·Tailscale 연결이 함께 끊긴다 — VSCode를 닫으면 핸드폰 연결도 같이 끊기는 증상의 원인이었다.

`.wslconfig`의 `vmIdleTimeout=-1` 설정은 "모든 배포판 인스턴스가 다 내려간 뒤 유틸리티 VM 자체"가 꺼지는 것만 막아줄 뿐, 개별 배포판 인스턴스가 클라이언트 없이 유휴로 내려가는 것 자체는 막지 못한다.

**해결**: 작업 스케줄러 액션을 `wsl.exe -d Ubuntu -e sleep infinity`로 바꿨다. 로그온 후 이 `wsl.exe` 프로세스가 절대 끝나지 않고 계속 붙어있는 **앵커 클라이언트** 역할을 해서, VSCode를 열든 닫든 배포판 인스턴스가 유휴로 내려가지 않게 고정한다.

## 정리

| 구성 요소 | 역할 | 비유 |
|---|---|---|
| Tailscale | 핸드폰↔PC 사이 안전한 가상 사설망 경로 제공 | 길을 뚫는다 |
| SSH | 인증 + 암호화된 원격 셸 프로토콜 | 정문이자 출입증 검사 |
| Termius | 핸드폰에서 SSH 접속을 여는 클라이언트 앱 | 문을 여는 손 |
| tmux | 접속이 끊겨도 세션 안 프로세스를 살려둠 | 나갔다 와도 그대로인 작업방 |

네 가지 도구가 각자 다른 문제(네트워크 경로, 인증·암호화, 클라이언트 UI, 접속 지속성)를 하나씩 해결하기 때문에, 어느 하나만 있어서는 이 원격 워크플로우가 완성되지 않는다. 반대로 이 조합을 한 번 갖춰두면, PC 앞이 아니어도 Claude Code와의 작업을 끊김 없이 이어갈 수 있다.
