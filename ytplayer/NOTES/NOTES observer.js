/*
O>S = observer to server, S>P = server to player, etc
Observers present a few problems

    identification: that you're an observer

    requests: might require O>S, S>P, P>S, S>O
        Could send all responses inherently for observers to them all OR
        requests are stored with request type, socket, connection id, time
        Or register for events - poss too complex for this tin pot.

        We need to know what a player would send back for a request e.g.
        Observer: getfullplaylist gets "fullplaylist" from player and passes straight through.
        O>S:getfullplaylist, S>P:getfullplaylist, P>S:fullplaylist, S checks request for
        Call/Response names must be established



How shall I do the call / reponse ?

1.  If you give a command I know that you expect this response e.g.
    O>S "getfullplaylist" (save to requests "fullplaylist")
    S>P "getfullplaylist"
    P>S "fullplaylist"
    S looks for "fullplaylist" in the request table.
    BASICALLY: The server knows what response is required


2.  The observer sends a command and reply it wants if it wants one
    O>S {action: "getfullplaylist", listen: "fullplaylist"}
    BASICALLY: Observers know what they want

3.  Observers register for events.  Now that's just silly.  Or is it

WHAT ABOUT player events that don't need a request like
    P>S "nowplaying"

    That should be sent to all observers
    Observers should identify themselves.
    This does mean observers might get info when they don't "want" them
*/