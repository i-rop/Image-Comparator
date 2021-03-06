
// ImageCompare is the namespace
var ImageCompare = (function (IC) {

    IC.TaskFeeder = {}; // this requires TaskFeeder to only be defined here

    IC.TaskFeeder.defaultComment = "<insert comment>";
    var  db_config_elem = document.getElementById("database");
    IC.TaskFeeder.db_config = db_config_elem.options[db_config_elem.selectedIndex].value;
    IC.TaskFeeder.hostname = IC.TaskFeeder.db_config == "localhost" ?
        "http://localhost:5984/" :
        "http://ec2-54-152-40-100.compute-1.amazonaws.com:5984/";
    IC.TaskFeeder.imageDbName = "rop_images/";

    // some of this is probably not needed
    IC.TaskFeeder.current_task = "";
    IC.TaskFeeder.current_task_idx = -1;
    IC.TaskFeeder.current_icl = ""; // image_classify_list


    IC.TaskFeeder.GetImageDbUrl = function () {

        var  db_config_elem = document.getElementById("database");
        IC.TaskFeeder.db_config = db_config_elem.options[db_config_elem.selectedIndex].value;
        IC.TaskFeeder.hostname = IC.TaskFeeder.db_config == "localhost" ?
            "http://localhost:5984/" :
            "http://ec2-54-152-40-100.compute-1.amazonaws.com:5984/";

        return IC.TaskFeeder.hostname + IC.TaskFeeder.imageDbName;
    };

    // consult results and image database to select two images to present to user
    IC.TaskFeeder.SetImage = function(username) {

        // update the dbconfig - guess this should be a function
        var  db_config_elem = document.getElementById("database");
        IC.TaskFeeder.db_config = db_config_elem.options[db_config_elem.selectedIndex].value;
        IC.TaskFeeder.hostname = IC.TaskFeeder.db_config == "localhost" ?
            "http://localhost:5984/" :
            "http://ec2-54-152-40-100.compute-1.amazonaws.com:5984/";

        var fullurl = IC.TaskFeeder.hostname + IC.TaskFeeder.imageDbName + '_design/basic_views/_view/incomplete_classify_tasks?key=\"' + username+ "\"";
        $.ajax({
            url : fullurl,
            type : 'GET',
            success : function(json) {

                var result = jQuery.parseJSON( json );
                var curUser = username;

                // of all pending tasks, are any assigned to this user?
                // hmm ... we filter by user, so this should not be needed, right?
                var newResRows = result.rows.filter(function(obj) {
                    return obj.value.user === username;
                });

                if (newResRows.length < 1)
                    return; // hmmm - some sort of message that there are no pending tasks?

                // default next task
                var task = newResRows[0].value;
                
                // now we want to find the task that has the lowest (positive?) task_order
                var minTaskOrder = Number.POSITIVE_INFINITY;
                for (var irow = 0; irow < newResRows.length; ++irow) {
                    // old ones might not even have a task_order
                    var rowVal = newResRows[irow].value;
                    if (rowVal.task_order && rowVal.task_order < minTaskOrder) {
                        task = rowVal;
                        minTaskOrder = rowVal.task_order;
                    }
                }

                var curICL = task.image_classify_list;
                var curTaskIdx = task.current_idx;

                // now get the next pair of image ids
                $.ajax({
                    url : IC.TaskFeeder.hostname + IC.TaskFeeder.imageDbName + '_design/basic_views/_view/image_classify_lists',
                    type : 'GET',
                    success: function (json) {
                        // okay, this seems wrong, we got all the tasks - way too much data over the wire
                        // filtering should happen on the server side - is this what reduce is for?

                        var nextimage;
                        var result = jQuery.parseJSON( json );
                        var found = false;
                        for (var ires = 0 ; ires < result.rows.length && !found; ++ires) {

                            var res = result.rows[ires];
                            if (res.id === curICL) {
                                found = true;
                                nextimage = res.value.list[curTaskIdx];

                                if (!nextimage)
                                    alert("no next image");
                            }
                        }

                        if (!found) {
                            alert("No pending tasks");
                            return;
                        }

                        var idx0 = nextimage;
                        var img0 = document.getElementById("image0");
                        //img0.src = IC.TaskFeeder.hostname + IC.TaskFeeder.imageDbName + idx0.toString() + "/image";
                        $("#image0").fadeOut(100, function() {
                            var newSrc = IC.TaskFeeder.hostname + IC.TaskFeeder.imageDbName + idx0.toString() + "/image";
                            var newImg = new Image(); // by having a new image, onload is called even if the image is already cached
                            newImg.onload = function() {
                                $("#image0").attr("src", newImg.src);
                                $("#image0").fadeIn(100);
                            };
                            newImg.src = newSrc;//.fadeIn(400);
                        });

                        IC.TaskFeeder.Image0 = idx0;

                        // should this be done sooner, before the second ajax call?
                        IC.TaskFeeder.current_icl = curICL;
                        IC.TaskFeeder.current_task_idx = curTaskIdx;
                        IC.TaskFeeder.current_task = task;
                    },
                    error: function (response) {
                        console.log("get of tasks failed : " + JSON.stringify(response));
                    }
                });

            },
            error: function (response) {
                console.log("get failed : " + JSON.stringify(response));
            }
        });


    };

    return IC;

}(ImageCompare || {}));
