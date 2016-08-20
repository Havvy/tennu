// Default Auth Object
const AUTH = {
    "+": "v",
    "%": "h",
    "@": "o",
    "&": "a",
    "~": "q"
};

// Object types
const Channel = function Channel(name) {
    if (!name) return null;
    const channel = Object.create(Channel.prototype);
    channel.name = name;
    channel.users = {};
    channel.topic = "";
    channel.topicHistory = []; // [Current, Previous, ... , First Known Topic]

    channel.banList = {};
    channel.exceptList = {};
    channel.inviteList = {};

    channel.modes = {
        v: {},
        h: {},
        o: {},
        a: {},
        q: {},
        b: {},
        e: {},
        I: {}
    };

    return channel;
}

Channel.prototype = {
    toString () {
        return this.name;
    },
    
    addUser (nick) {
        const authModes = [];
        while (nick[0] in AUTH) {
            authModes.push(AUTH[nick[0]]);
            nick = nick.slice(1);
        }

        this.users[nick] = nick;

        const addAuthToNick = (mode) => {
            this.updateModes({mode, parameter: nick, set: true});
        };

        authModes.forEach(addAuthToNick);
    },

    removeUser (nick) {
        delete this.users[nick];
        for (var symbol in AUTH) {
            if (this.modes[AUTH[symbol]][nick]) this.updateModes({mode: AUTH[symbol], parameter: nick, set: false});
        }
    },
    
    renameUser (nick, newNick) {
        this.users[newNick] = this.users[nick];
        for (var symbol in AUTH) {
            if (this.modes[AUTH[symbol]][nick]) this.updateModes({mode: AUTH[symbol], parameter: newNick}, this.modes[AUTH[symbol]][nick]);
        }
        this.removeUser(nick);
    },
    
    getUsers () {
        return Object.keys(this.users);
    },
    
    // Iterate over user nicks
    forEachUser (fn) {
        if (typeof fn !== "function") return null;
        this.getUsers().forEach(fn);
        return true;
    },
    
    updateTopic (topic) {
        this.topic = topic;
        this.topicHistory.unshift({topic:topic});
    },
    
    updateTopicInfo (editedBy, lastEdited) {
        this.topicHistory[0].editedBy = editedBy;
        this.topicHistory[0].lastEdited = lastEdited;
    },
    
    updateModes (modeObj, sender, time) {
        time = Number(time) || Date.now();
        const mode = modeObj.mode
        const set = Boolean(modeObj.set)
        const parameter = modeObj.parameter || false;
        const listModes = {"v":"+","h":"%","o":"@","a":"&","q":"~","b":"bans","e":"excepts","I":"invited"};
        if (mode in listModes) {
            if (!this.modes[mode]) this.modes[mode] = {};
            if (set) {
                this.modes[mode][parameter] = sender || undefined;
            } else {
                delete this.modes[mode][parameter];
            }
        } else {
            if (set) {
                this.modes[mode] = parameter || true;
            } else {
                client.debug(`Removing ${mode} mode.`);
                delete this.modes[mode];
            }
        }
        // Additional Mode-specific Handling
        switch (mode) {
            case "b":
                this.addBan(parameter, sender, time);
                break;
            case "e":
                this.addExcept(parameter, sender, time);
                break;
            case "I":
                this.addInvite(parameter, sender, time);
                break;
        }
    },
    
    // If auth is a valid user mode string (v/h/o/a/q and their respective sigils)
    //   return a boolean if the user is at or above that auth level.
    // Else Returns the highest user mode q > a > o > h > v
    highestAuth: function (nick, auth) {
        nick = nick || "";
        if (!this.users[nick]) return null;
        if (auth in AUTH) auth = AUTH[auth];
        const authLevels = ["q", "a", "o", "h", "v"];
        auth = authLevels.indexOf(auth) > -1 ? auth : false;
        let nickAuth = "";
        for (const mode in authModes) {
            if (this.modes[mode][nick]) {
                if (auth) {
                    if (authLevels.indexOf(mode) <= authLevels.indexOf(auth)) {
                        nickAuth = true;
                        break;
                    }
                } else {
                    nickAuth += mode;
                }
            }
        }
        if (auth && !nickAuth) return false;
        return nickAuth;
    },

    addBan (target, setBy, setTime, reason) {
        if (!target) return null;
        setBy = setBy || "";
        setTime = Number(setTime) || Date.now();
        reason = reason || "";
        this.banList[target] = { setBy, setTime, reason };
        return true;
    },

    addExcept (target, setBy, setTime) {
        if (!target) return null;
        setBy = setBy || "";
        setTime = Number(setTime) || Date.now();
        this.exceptList[target] = { setBy, setTime };
        return true;
    },

    addInvite: function (target, setBy, setTime) {
        if (!target) return null;
        setBy = setBy || "";
        setTime = Number(setTime) || Date.now();
        this.inviteList[target] = { setBy, setTime };
        return true;
    }
};

var channel_plugin = {
    name: "channels",
    requires: ["messages", "self"],
    init (client, imports) {
        const Channels = function Channels(name) {
            if (typeof name === "undefined") return Channels.chans();
            if (typeof name === "string") return Channels.get(name);
            throw new TypeError("Channels function must either be given a string or undefined.");
        };

        Channels.channels = {};

        Channels.get = function (name) {
            return Channels.channels[name];
        };

        Channels.all = function (sortFn) {
            return Object.keys(Channels.channels).sort(sortFn)
        };

        Channels.chans = function (sortFn) {
            return Object.keys(Channels.channels).map(Channels.get).sort(sortFn);
        };

        const addChannel = function (name) {
            Channels.channels[name] = Channel(name);
        };

        const removeChannel = function (name) {
            delete Channels.channels[name];
        }

        const handlers = {
            // NOTE(Dan_Ugore): client.on("join") Add a user or channel
            join ({channel, nickname}) {
                const isSelf = client.nickname() === nickname;
                if (isSelf) {
                    addChannel(channel);
                    client.mode(channel, "b"); // Get bans
                    client.mode(channel, "e"); // Get excepts
                    client.mode(channel, "I"); // Get invites
                } else {
                    Channels.get(channel).addUser(nickname);
                }
            },

            // NOTE(Dan_Ugore): client.on("quit") Remove user from all channels and from user list
            quit ({nickname}) {
                Channels.chans().forEach(function (chan) {
                    if (nickname in chan.users) {
                        chan.removeUser(nick);
                    }
                });
            },

            // NOTE(Dan_Ugore): client.on("part") Remove user from parted channel
            part ({channel, nickname}) {
                var isSelf = client.nickname() === nickname;
                if (isSelf) {
                    removeChannel(channel);
                } else {
                    Channels.get(channel).removeUser(nickname);
                }
            },

            // NOTE(Dan_Ugore): client.on("kick") Remove kicked user from channel
            kick ({channel, kicked}) {
                var isSelf = client.nickname() === kicked;
                if (isSelf) {
                    delete removeChannel(channel);
                } else {
                    Channels.get(channel).removeUser(kicked);
                }
            },

            // NOTE(Dan_Ugore): client.on("nick") Update nick across channels
            nick ({old: nickname, new: newNick}) {
                Channels.chans().forEach(function (chan) {
                    if (nickname in chan.users) chan.renameUser(nickname, newNick);
                });
            },

            // NOTE(Dan_Ugore): client.on("332") Update Topic
            332 ({channel, topic}) {
                Channels.get(channel).updateTopic(topic);
            },

            // NOTE(Dan_Ugore): client.on("333") Update Topic Info
            333 ({channel, who, timestamp}) {
                Channels.get(channel).updateTopicInfo(who, timestamp);
            },

            // NOTE(Dan_Ugore): client.on("353") Update channel with users
            353 ({channel, nicknames}) {
                channel = Channels.get(channel);
                nicknames.forEach(channel.addUser.bind(channel));
            },

            // Lists

            // Banlist
            367 ({channel, hostmaskPattern, setter, timestamp}) {
                channel = Channels.get(channel);
                if (!channel) return;
                channel.updateModes({mode: "b", parameter: hostmaskPattern, set: true}, setter, timestamp);
            },

            // ExceptList
            346 ({channel, hostmaskPattern, setter, timestamp}) {
                channel = Channels.get(channel);
                channel.updateModes({mode: "e", parameter: hostmaskPattern, set: true}, setter, timestamp);
            },

            // InviteList
            348 ({channel, hostmaskPattern, setter, timestamp}) {
                channel = Channels.get(channel);
                channel.updateModes({mode: "I", parameter: hostmaskPattern, set: true}, setter, timestamp);
            },

            mode ({channel, nickname, modes}) {
                if (channel.charAt(0) !== "#") {
                    return;
                }

                const handleMode = function (modeObj) {
                    Channels.get(channel).updateModes(modeObj, nickname);
                };

                modes.forEach(handleMode);
            }
        };

        return {
            handlers,
            exports: Channels,
            commands: [],
        };
    }
}

module.exports = channel_plugin;
