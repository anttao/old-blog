$(document).ready(function(){
    $('.tree').on('click', function (e) {
        $('.tree .delSeries').each(function () {
            if($(this)[0].contains(e.target)) {
                if(confirm("确定要移除这篇文章吗？")){
                    //去掉当前行
                    $(this).parent().parent().remove();
                }
            }
        });
        $('.tree .addSeries').each(function () {
            if($(this)[0].contains(e.target)) {
                var html = "<tr><td>" +
                    "<div class='input-group'>"+
                    "<input type='text' name='pName' class='form-control'>"+
                    "<input type='hidden' name='pId' value='0'>"+
                    "<span class='input-group-btn'>"+
                    "<button type='button' class='btn btn-default' data-toggle='modal' data-target='#articles'>...</button>"+
                    "</span></div></td>"+
                    "<td align='center'><span class='btn btn-danger delSeries'>删除</span></td></tr>";
                $(".tree>tbody").append(html);
            }
        });
    });
});
