#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Telegram-бот для игры «Небесный уворот».
Минимальная реализация без сторонних библиотек (только stdlib).

НАСТРОЙКА (один раз, ~5 минут):
1. В Telegram откройте @BotFather, команда /newbot, следуйте инструкциям.
   Получите токен вида 123456789:AAF... — вставьте его в TOKEN ниже.
2. В @BotFather команда /newgame:
   - выберите созданного бота;
   - название: Небесный уворот;
   - описание: Уклоняйся от метеоритов, собирай звёзды!;
   - отправьте фото обложки promo/cover-itch-630x500.png;
   - короткое имя (short name): nebesniy_uvorot (то же, что в GAME_SHORT_NAME ниже).
3. В @BotFather команда /mygames -> выберите игру -> Edit -> Edit URL,
   укажите https-ссылку на игру (например, GitHub Pages).
4. Запустите: python bot.py
   Бот работает, пока запущен скрипт (для постоянной работы — любой хостинг
   с Python или компьютер, который не выключается; для старта хватит и своего ПК).
"""
import json
import urllib.request
import urllib.parse

TOKEN = "ВСТАВЬТЕ_ТОКЕН_ОТ_BOTFATHER"
GAME_SHORT_NAME = "nebesniy_uvorot"
GAME_URL = "https://moonbl123.github.io/nebesniy-uvorot/"

API = "https://api.telegram.org/bot" + TOKEN


def api_call(method, params):
    data = urllib.parse.urlencode(params).encode("utf-8")
    req = urllib.request.Request(API + "/" + method, data=data)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def send_game(chat_id):
    keyboard = {
        "inline_keyboard": [[{"callback_game": {"game_short_name": GAME_SHORT_NAME}}]]
    }
    api_call("sendGame", {
        "chat_id": chat_id,
        "game_short_name": GAME_SHORT_NAME,
        "reply_markup": json.dumps(keyboard),
    })


def answer_callback(callback_id):
    api_call("answerCallbackQuery", {
        "callback_query_id": callback_id,
        "url": GAME_URL,
    })


def main():
    if TOKEN == "ВСТАВЬТЕ_ТОКЕН_ОТ_BOTFATHER":
        raise SystemExit("Сначала впишите токен от @BotFather в переменную TOKEN.")

    print("Бот запущен. Остановка: Ctrl+C")
    offset = 0
    while True:
        try:
            updates = api_call("getUpdates", {"offset": offset, "timeout": 30})
            for upd in updates.get("result", []):
                offset = upd["update_id"] + 1

                msg = upd.get("message") or upd.get("edited_message")
                if msg and "text" in msg:
                    text = msg["text"]
                    if text.startswith("/start") or text.startswith("/game"):
                        send_game(msg["chat"]["id"])

                cb = upd.get("callback_query")
                if cb and cb.get("game_short_name") == GAME_SHORT_NAME:
                    answer_callback(cb["id"])
        except KeyboardInterrupt:
            print("Остановлено.")
            break
        except Exception as e:
            print("Ошибка (продолжаю работу):", e)


if __name__ == "__main__":
    main()
