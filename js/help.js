function start() {
    $(".panel-body").hide();
    $(".panel").click(function () {
        const body = $(this).find(".panel-body");
        if (body.is(":visible")) {
            body.slideUp(250);
        } else {
            $(".panel-body").slideUp(250);
            body.slideDown(250);
        }
    });
}
