function start() {
    $('#jstree-container').jstree({
        core: {
              'data' : {
                'url' : "/api/v1.0/tree/taxa",
                'data' : function (node) {
                  return { 'id' : node.id === "#" ? 1 : node.id};
                }
              }
        },
        types: {
            default: {
                icon: "fa fa-sitemap",
                type_attr: "maybe"
            },
            strain: {
                icon: "fa fa-circle-o",
                type_attr: "heyooo"
            }
        },
        plugins: ["wholerow", "types"]
    }).on("click", ".jstree-node", function(e, data) {
        const assembly = $(this).attr("data-assembly");
        if (!assembly) {
            return;
        }
        $.ajax({
            method: 'get',
            url: `/api/v1.0/assembly/${assembly}`,
            dataType: 'json',
            contentType: 'application/json',
            processData: false,
            async: true,
            success: function (data, status, req) {
                showResults({"clusters": data, "disable_stats": true});
                $(".result-display").hide();
                $(".result-actual").show();
            },
            error: function (data, status, req) {
                $(".result-display").hide();
                $(".result-error").show();
            }
        });
        $(".result-display").hide();
        $(".result-loading").show();
    });
}
// on clicking a strain, go to api/v1.0/assembly/id with version
