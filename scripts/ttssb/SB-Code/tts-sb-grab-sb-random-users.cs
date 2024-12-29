/**
    Streamerbot keeps a list of users that have been in your chat - and some that clearly haven't

    I want to let them be merged with the users that we grab from when they've chatted

randomUser22	CheekyBot3000
randomUserName22	cheekybot3000
randomUserId22	574953343
randomUserType22	twitch

*/


using System;
using System.Collections.Generic;

public class CPHInline
{
    const string CL_ACTION_NAME = "[Sockets] Console.Log";
    const string CL_METHOD_PREFIX = "log_message_"; // followed by one of r g b c m y

	public bool Execute()
	{
		// your main code goes here
        try {
            create_users_from_random_global();
        } catch (Exception e) {
            console_log(e.ToString());
        }

		return true;
	}


    public void create_users_from_random_global() {
            // loop through user vars until they're present
        Dictionary<string, string> users = new Dictionary<string,string>();

        console_log("Grabbing random users...");

        int i = 0;

        while(true) {
            string idIdx = "randomUserId" + i;
            string nameIdx = "randomUser" + i;

            if ( !args.ContainsKey(idIdx))
                break;

            users.Add(args[idIdx].ToString(), args[nameIdx].ToString()  );

            i++;
        }

        console_log("Streamerbot Random Users found:" + i);

        CPH.SetArgument("TWITCH_USERS_FROM_RANDOM", users);
        //CPH.SetGlobalVar("TWITCH_USERS_FROM_RANDOM", users, true);
    }


	public bool console_log(string msg, string col = "w") {
        CPH.SetArgument("logmessage", msg);
        CPH.SetArgument("logcolour", col);

        return CPH.ExecuteMethod(CL_ACTION_NAME, CL_METHOD_PREFIX + col);
	}
}
