/*
****************************
WARNING URGENT WARNING NOTE:
****************************

Streamerbot is a cunt.  A fucking utterly clueless cunt.
Actions can piss around with each other, set argument and actionName being the same across them.
Fucking horrific.  Make sure you use different or BLOCKING queues.

Calling an action immediate during a C# method doesn't wait for it to finish so you can't
have a task that returns values and rely on it.


Server handling code should be done in one action and dealt with in C# making sure that
you also don't end up fucking yourself over if it can run asynchronously.

If you want stuff also run by an !action then in that action set "data" and then call the c# action.

THE CONTROLLER PAGE:
    Play page will have to notify on
        play changes, playlist changes

    Observer page could use a different socket OR
    Notify that it's an observer and be put in an observer list
    Then the player will have to say it's a player




Player has 2 internal playlists

NO LONGER TRUE:
        queued
        have played

        Then if a video is added the queued list can be reshuffled or
        the video can be put at the start of the list

        This lets the player have a list for continuous play even if streamerbot goes wrong.

        Prev / next - if I'm using the partially shuffling technique then this could cause problems unless I keep a pointer
        into the played list

        Imagine the state of played is

        1 2 3 then somebody goes next.  A value of 4 will be pulled from queued
        . <- do is playead
        1234 this is fine, Queued can still be shuffled without notice.  Then prev happens 4 times taking you back to 1
        .
        1234 doing a prev here is fine, you just pull a value from Queued but put it at the start of the list
        .
        51234 when the song is finished this time the playhead will move forward.
        NEXT doesn't grab a video from Queued until playlistPointer == playlistPlayed.length -1 and a next is received

        This might seem complex but it lets added songs to occur randomly

        SHUFFLING PROBLEMS.  With Queued and Played
        What if you queue three videos that are "nexts".
            Normal adds shuffle the Queued, they must not shuffle the nexts
            Nexts counter addition means any new videos added after the initial

        shuffle could be inserted at a random position of Queued.length - nextsCounter


I could add a search



In Streamerbot the videos will have

id number for easy deletion - this is added to the map when I use #add.
id for youtube
title to make it easy to delete
owner for who added it

Dictionaries get converted to Json when using SetGlobalVar, that's fine


!currvid command gives out info so it's easy to do a delete or search
Having videos indexed by the youtube id might make them easy to singleton - yes, they're map indexes



GET https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&key=[YOUR_API_KEY] HTTP/1.1

my actual
https://youtube.googleapis.com/youtube/v3/videos?part=snippet&key=AIzaSyBRPuveJXC18b_bf6PIIUYFrkRwlGjK6P4&id=Ks-_Mh1QhMc

Masking
https://youtube.googleapis.com/youtube/v3/videos?part=snippet&key=AIzaSyBRPuveJXC18b_bf6PIIUYFrkRwlGjK6P4&fields=items.snippet.description,items.snippet.title&id={youtubeid}


https://cloud.google.com/apis/docs/system-parameters
https://developers.google.com/youtube/v3/docs/videos/list


Streamerbot JSON
using Newtonsoft.Json.Linq;
JToken jp = JToken.Parse(vidjson);
string foo = string jp["some"][0]["thing"];

Messages
pause
resume
next
prev
volume
shuffle

add
add next

delete

add videos

needs shuffle action


   ******************** ARRAY Functions as I forget ******************

   UNshift pushes one onto the bottom of a stack, like push both have U to add

   Inserts at a certain position, like adding nexts to the front in order

   splice(position, delete num, item, item, item...);


   4
   3
   2
   1
   0

   nexts = 2, add a next

   list.splice(list.length-nexts)










    *********************** MESSAGING SYSTEM **********************

I should have a system like I had once before where a returned message can trigger a function

All methods would have to take a single object as the parameter.

{
    action: "runmethod",
    method: "some_func",
    data: {
        some: object,
        for : some_func
    }
}

{
    action: "runmethod",
    method: "add_videos",
    data: {
        videos: [array,of,video,ids]
    }
}



-1 – unstarted
0 – ended
1 – playing
2 – paused
3 – buffering
5 – video cued



Error codes from the player
150 when I tried a non video that was unavailabled
151 is region, or copyright or something

      .
12345678
01234567
  ^
  Away = Req idx - Curr Idx, if < 0 add length


  Chat:
    add request
    del request
    info

Server
    Load from store
    Add to store
    Init add to list then shuffle

Commands UP
    sendplaylist
    delete videoid (converted from number)


Commands DOWN
    pause
    resume
    play
    add (has next)
    shuffle (all, remaining)
    videoinfo curr playing title, adder, numeric id
    delete videoid

Commands TWITCH
    next()
    prev()
    pause()
    play()
    shuffle() Exception
    volume

    addtemp - just this session
    add - permanently

    lockout - for me to stop nonsense


 ORDER OF PLAY

 js ON CONNECT Should ask for the playlist if it hasn't already
    Possibly ALWAYS after a reconnect in case commands have added videos (rare)







*/