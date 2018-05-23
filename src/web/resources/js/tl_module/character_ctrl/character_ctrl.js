// Formulaire de Traitre-Lame
"use strict";

characterApp.controller("character_ctrl", ["$scope", "$q", "$http", "$window", /*"$timeout",*/ function ($scope, $q, $http, $window) {
  // var data_source = "http://" + window.location.host + "/update_user";
  // var socket = new SockJS(data_source);
  $scope.is_admin = $window.location.pathname.indexOf("/admin") >= 0;

  $scope.isMobile = function () {
    return $scope.$parent.active_style == 'Petite personne';
  };

  // todo move this variable in json
  $scope.xp_default = 6;

  $scope.sheet_view = {};
  $scope.sheet_view.mode = "form_write";

  $scope.html_qr_code = "";
  $scope.url_qr_code = "";

  $scope.player = null;
  $scope.last_player = null;
  $scope.character = null;
  $scope.last_character = null;
  $scope.ddb_user = [];
  $scope.characterEdit = true;
  $scope.new_player = false;
  $scope.new_character = false;
  $scope.no_character = true;
  $scope.character_point = {};

  $scope.model_database = {};
  $scope.model_user = {};
  $scope.schema_user = {};
  $scope.form_user = [];

  $scope.model_char = {};
  $scope.schema_char = {};
  $scope.form_char = [];

  // using character sheet as cs for brevity
  $scope.cs_player = {};
  $scope.cs_character = {};
  $scope.cs_character_habilites = {};
  $scope.cs_setting = "filled";
  $scope.cs_checks = [];

  $scope.status_send = {
    enabled: false,
    is_error: false,
    text: ""
  };

  $scope.approbation_status = {
    enabled: false,
    is_error: false,
    text: ""
  };

  // fill user and character schema and form
  $scope.update_character = function (e) {
    var char_rule_url = $scope.is_admin ? "/cmd/manual_admin" : "/cmd/manual";
    $http({
      method: "get",
      url: char_rule_url,
      headers: {"Content-Type": "application/json; charset=UTF-8"},
      timeout: 5000
    }).then(function (response/*, status, headers, config*/) {
      console.info(response);
      var data = response.data.char_rule;
      $scope.schema_user = data.schema_user;
      $scope.schema_char = data.schema_char;
      $scope.form_user = data.form_user;
      $scope.form_char = data.form_char;
      $scope.model_database = response.data;
    }, function errorCallback(response) {
      console.error(response);
    });

  };
  $scope.update_character();

  $scope.is_approbation_new = function (user) {
    return user && (isUndefined(user.character[0].approbation) || user.character[0].approbation.status == 0);
  };

  $scope.is_approbation_approved = function (user) {
    return user && isDefined(user.character[0].approbation) && user.character[0].approbation.status == 1;
  };

  $scope.is_approbation_unapproved = function (user) {
    return user && isDefined(user.character[0].approbation) && user.character[0].approbation.status == 2;
  };

  $scope.is_approbation_inactive = function (user) {
    return user && isDefined(user.character[0].approbation) && user.character[0].approbation.status == 3;
  };

  $scope.is_approbation_to_correct = function (user) {
    return user && isDefined(user.character[0].approbation) && user.character[0].approbation.status == 4;
  };

  $scope.get_timestamp_approbation_date = function (user) {
    if (user) {
      return user.character[0].approbation.date;
    }
    return -1;
  };

  $scope.get_text_select_character = function (user) {
    var txt_append = "";
    if ($scope.is_approbation_new(user)) {
      txt_append = '✪';
    } else if ($scope.is_approbation_approved(user)) {
      txt_append = '✓';
    } else if ($scope.is_approbation_unapproved(user)) {
      txt_append = '✗';
    } else if ($scope.is_approbation_inactive(user)) {
      txt_append = '✞';
    } else if ($scope.is_approbation_to_correct(user)) {
      txt_append = '✐';
    } else {
      txt_append = '?';
    }
    return txt_append + " " + user.name;
  };

  $scope.send_approbation = function (status) {
    var data = {};
    data.user_id = $scope.model_user.user_id;
    data.character_name = $scope.model_char.name;
    data.approbation_status = status;

    $http({
      method: "post",
      url: "/cmd/character_approbation",
      headers: {"Content-Type": "application/json; charset=UTF-8"},
      data: data,
      timeout: 5000
    }).then(function (response/*, status, headers, config*/) {
      var data = response.data;
      if (isDefined(response.error)) {
        $scope.approbation_status.enabled = true;
        $scope.approbation_status.is_error = true;
        $scope.approbation_status.text = data.error;
      } else {
        $scope.approbation_status.enabled = true;
        $scope.approbation_status.is_error = false;
        $scope.approbation_status.text = "Succès.";

        var data_approbation = {"date": data.data.date, "status": data.data.status};
        $scope.character.approbation = data_approbation;
      }

    }, function errorCallback(response) {
      console.error(response);

      $scope.approbation_status.enabled = true;
      $scope.approbation_status.is_error = true;

      if (response.status == -1) {
        // Timeout
        $scope.approbation_status.text = "Timeout request.";
      } else {
        // Error from server
        $scope.approbation_status.text = "Error from server : " + response.status;
      }
    });
  };

  $scope.onSubmit = function (form) {
    // First we broadcast an event so all fields validate themselves
    $scope.$broadcast('schemaFormValidate');

    // Then we check if the form is valid
    if (form.$valid) {
      var data = {};
      data.player = $scope.model_user;
      data.character = $scope.model_char;

      $http({
        method: "post",
        url: "/cmd/character_view",
        headers: {"Content-Type": "application/json; charset=UTF-8"},
        data: data,
        timeout: 5000
      }).then(function (response/*, status, headers, config*/) {
        $scope.status_send.enabled = true;
        $scope.status_send.is_error = false;
        $scope.status_send.text = "Succès.";

        // TODO not suppose to need to reload the page, block by socket update
        $window.location.reload();
      }, function errorCallback(response) {
        console.error(response);

        $scope.status_send.enabled = true;
        $scope.status_send.is_error = true;

        if (response.status == -1) {
          // Timeout
          $scope.status_send.text = "Timeout request.";
        } else {
          // Error from server
          $scope.status_send.text = "Error from server : " + response.status;
        }
      });

    }
  };

  $scope.$watch("model_user", function (value) {
    if (value) {
      $scope.prettyModelUser = JSON.stringify(value, undefined, 2);
    }
    // todo : update player
    // $scope.player = value;
  }, true);

  $scope.$watch("model_char", function (value) {
    if (value) {
      $scope.prettyModelChar = JSON.stringify(value, undefined, 2);
      // if ($scope.character == null) {
      //   return;
      // }
      //
      // // Update all documentation
      // var manual = $scope.model_database.manual;
      // for (var key in $scope.schema_char.properties) {
      //   var find_key = false;
      //   var manual_doc = "";
      //   var point = null;
      //
      //   // Find appropriate documentation
      //   for (var i1 = 0; i1 < manual.length; i1++) {
      //     var sec1 = manual[i1];
      //
      //     // Duplicated code to find key
      //     if (isDefined(sec1.model) && sec1.model == key) {
      //       find_key = true;
      //
      //       if (isDefined(sec1.description)) {
      //         manual_doc = sec1.description;
      //       }
      //       if (isDefined(sec1.point)) {
      //         point = sec1.point;
      //       }
      //       break;
      //     }
      //     // END Duplicated code to find key
      //
      //     if (sec1.section) {
      //       for (var i2 = 0; i2 < sec1.section.length; i2++) {
      //         var sec2 = sec1.section[i2];
      //
      //         // Duplicated code to find key
      //         if (isDefined(sec2.model) && sec2.model == key) {
      //           find_key = true;
      //
      //           if (isDefined(sec2.description)) {
      //             manual_doc = sec2.description;
      //           }
      //           if (isDefined(sec2.point)) {
      //             point = sec2.point;
      //           }
      //           break;
      //         }
      //         // END Duplicated code to find key
      //
      //         if (sec2.section) {
      //           for (var i3 = 0; i3 < sec2.section.length; i3++) {
      //             var sec3 = sec2.section[i3];
      //
      //             // Duplicated code to find key
      //             if (isDefined(sec3.model) && sec3.model == key) {
      //               find_key = true;
      //
      //               if (isDefined(sec3.description)) {
      //                 manual_doc = sec3.description;
      //               }
      //               if (isDefined(sec3.point)) {
      //                 point = sec3.point;
      //               }
      //               break;
      //             }
      //             // END Duplicated code to find key
      //
      //             if (sec3.section) {
      //               for (var i4 = 0; i4 < sec3.section.length; i4++) {
      //                 var sec4 = sec3.section[i4];
      //
      //                 // Duplicated code to find key
      //                 if (isDefined(sec4.model) && sec4.model == key) {
      //                   find_key = true;
      //
      //                   if (isDefined(sec4.description)) {
      //                     manual_doc = sec4.description;
      //                   }
      //                   if (isDefined(sec4.point)) {
      //                     point = sec4.point;
      //                   }
      //                   break;
      //                 }
      //                 // END Duplicated code to find key
      //
      //                 if (sec4.section) {
      //                   for (var i5 = 0; i5 < sec4.section.length; i5++) {
      //                     var sec5 = sec4.section[i5];
      //
      //                     // Duplicated code to find key
      //                     if (isDefined(sec5.model) && sec5.model == key) {
      //                       find_key = true;
      //
      //                       if (isDefined(sec5.description)) {
      //                         manual_doc = sec5.description;
      //                       }
      //                       if (isDefined(sec5.point)) {
      //                         point = sec5.point;
      //                       }
      //                       break;
      //                     }
      //                     // END Duplicated code to find key
      //                   }
      //                 }
      //               }
      //             }
      //           }
      //         }
      //       }
      //     }
      //   }

      // if (find_key) {
      //   console.info("Find key " + key);
      //   // $scope.schema_char.properties[key].description = point;
      //
      //   // $scope.character_point = Object.assign($scope.character_point, point);
      //   // var character = $scope.model_char;
      //   // if (key in character) {
      //   //   Object.keys(character[key]).forEach(function (hab) {
      //   //     console.info(hab);
      //   //     for (var key_point in point) {
      //   //       if (key_point in $scope.character_point) {
      //   //         $scope.character_point[key_point] += point[key_point];
      //   //       } else {
      //   //         $scope.character_point[key_point] = point[key_point];
      //   //       }
      //   //     }
      //   //   });
      //   // }
      //
      //
      // } else {
      //   continue
      // }
    }
    $scope.character_point = {};
    if (isDefined($scope.model_char.energie)) {
      for (var i = 0; i < $scope.model_char.energie.length; i++) {
        var sub_key = "Energie_1";
        if (sub_key in $scope.model_database.point) {
          var dct_key_point = $scope.model_database.point[sub_key];

          for (var key_point in dct_key_point) {
            if (dct_key_point.hasOwnProperty(key_point)) {
              var point_value = dct_key_point[key_point];
              if (key_point in $scope.character_point) {
                $scope.character_point[key_point] += point_value;
              } else {
                $scope.character_point[key_point] = point_value;
              }
            }
          }
        }
      }
    }
    if (isDefined($scope.model_char.endurance)) {
      for (var i = 0; i < $scope.model_char.endurance.length; i++) {
        var sub_key = "Endurance_1";
        if (sub_key in $scope.model_database.point) {
          var dct_key_point = $scope.model_database.point[sub_key];

          for (var key_point in dct_key_point) {
            if (dct_key_point.hasOwnProperty(key_point)) {
              var point_value = dct_key_point[key_point];
              if (key_point in $scope.character_point) {
                $scope.character_point[key_point] += point_value;
              } else {
                $scope.character_point[key_point] = point_value;
              }
            }
          }
        }
      }
    }
    if (isDefined($scope.model_char.habilites)) {
      for (var i = 0; i < $scope.model_char.habilites.length; i++) {
        var obj = $scope.model_char.habilites[i];
        if (isDefined(obj.options)) {
          // total_xp += obj.options.length;
          // Find the associate point
          for (var j = 0; j < obj.options.length; j++) {
            var sub_key = obj.options[j];

            if (sub_key in $scope.model_database.point) {
              var dct_key_point = $scope.model_database.point[sub_key];

              for (var key_point in dct_key_point) {
                if (dct_key_point.hasOwnProperty(key_point)) {
                  var point_value = dct_key_point[key_point];
                  if (key_point in $scope.character_point) {
                    $scope.character_point[key_point] += point_value;
                  } else {
                    $scope.character_point[key_point] = point_value;
                  }
                }
              }
            }
          }
        }
      }
    }
    if (isDefined($scope.model_char.technique_maitre)) {
      for (var i = 0; i < $scope.model_char.technique_maitre.length; i++) {
        var obj = $scope.model_char.technique_maitre[i];
        if (isDefined(obj.options)) {
          // total_xp += obj.options.length;
          // Find the associate point
          for (var j = 0; j < obj.options.length; j++) {
            var sub_key = obj.options[j];

            if (sub_key in $scope.model_database.point) {
              var dct_key_point = $scope.model_database.point[sub_key];

              for (var key_point in dct_key_point) {
                if (dct_key_point.hasOwnProperty(key_point)) {
                  var point_value = dct_key_point[key_point];
                  if (key_point in $scope.character_point) {
                    $scope.character_point[key_point] += point_value;
                  } else {
                    $scope.character_point[key_point] = point_value;
                  }
                }
              }
            }
          }
        }
      }
    }
    // }
    // for (var key in $scope.model_char) {
    //   // check if the property/key is defined in the object itself, not in parent
    //   if ($scope.model_char.hasOwnProperty(key)) {
    //     for (var hab in $scope.model_char[key]) {
    //       for (var i = 0; i < $scope.model_char[key].length; i++) {
    //         console.info($scope.model_char[key][i]);
    //       }
    //     }
    //   }
    // }
    //
    // console.info("yo");
    // console.info($scope.character_point);
    // todo : update player
    // $scope.player = value;
  }, true);

  $scope.$watch("player", function (value) {
    if (!value) {
      return;
    }
    $scope.prettyPlayer = JSON.stringify(value, undefined, 2);
    // update model information
    $scope.model_user = filterIgnore(value, ["$$hashKey", "character"]);
    // var first_id;
    // for(first_id in $scope.model_user.character) break;
    // $scope.model_char = $scope.model_user.character[first_id];
    // TODO put xp default in json configuration file
    // TODO need to find right id character, and not taking first!
    if (isDefined(value.character)) {
      var firstChar = value.character[0];
      $scope.model_char = filterIgnore(firstChar, ["$$hashKey"]);

      // TODO need to feel empty field
      if (!isDefined(firstChar.habilites)) {
        $scope.model_char.habilites = [{}];
      }
      if (!isDefined(firstChar.technique_maitre)) {
        $scope.model_char.technique_maitre = [];
      }
      if (!isDefined(firstChar.rituel)) {
        $scope.model_char.rituel = [];
      }
      if (!isDefined(firstChar.xp_naissance)) {
        $scope.model_char.xp_naissance = $scope.xp_default;
      }
      if (!isDefined(firstChar.xp_autre)) {
        $scope.model_char.xp_autre = 0;
      }

      $scope.cs_player = $scope.player;
      $scope.cs_setting = "filled";
    } else {
      $scope.model_char = {};
      $scope.model_char.habilites = [{}];
      $scope.model_char.technique_maitre = [];
      $scope.model_char.rituel = [];
      $scope.model_char.xp_naissance = $scope.xp_default;
      $scope.model_char.xp_autre = 0;

      $scope.cs_player = {};
    }
    $scope.get_html_qr_code();
  }, true);

// $scope.$watch("character", function (value) {
//   $scope.cs_character = $scope.character;
//   // $scope.fill_cs_character_habilites();
// }, true);

// $scope.characterSheetPrintOptionChange = function (value) {
//   if ($scope.cs_setting == "filled") {
//     $scope.cs_player = $scope.player;
//     $scope.cs_character = $scope.character;
//     // $scope.fill_cs_character_habilites();
//     console.log($scope.getSheetOutput($scope.cs_character.endurance.total));
//   } else {
//     $scope.cs_player = {};
//     $scope.cs_character = {};
//     $scope.cs_character_habilites = [];
//   }
// };

// $scope.fill_cs_character_habilites = function () {
//   // lvl 1 : 4 disciplines
//   // lvl 2 : 2 habilités
//   // lvl 3 : 3 options
//   // var max_discipline = 4;
//   // var max_unique_discipline = 2;
//   // var max_hability = 2;
//   // var max_unique_hability = 1;
//   var i_discipline = 0;
//
//   var dct_model = [
//     {
//       "discipline": "",
//       "hab_A": "",
//       "hab_A_1": "",
//       "hab_A_2": "",
//       "hab_A_3": "",
//       "hab_B": "",
//       "hab_B_1": "",
//       "hab_B_2": "",
//       "hab_B_3": ""
//     },
//     {
//       "discipline": "",
//       "hab_A": "",
//       "hab_A_1": "",
//       "hab_A_2": "",
//       "hab_A_3": "",
//       "hab_B": "",
//       "hab_B_1": "",
//       "hab_B_2": "",
//       "hab_B_3": ""
//     },
//     {
//       "discipline": "",
//       "hab_A": "",
//       "hab_A_1": "",
//       "hab_A_2": "",
//       "hab_A_3": "",
//       "hab_B": "",
//       "hab_B_1": "",
//       "hab_B_2": "",
//       "hab_B_3": ""
//     },
//     {
//       "discipline": "",
//       "hab_A": "",
//       "hab_A_1": "",
//       "hab_A_2": "",
//       "hab_A_3": "",
//       "hab_B": "",
//       "hab_B_1": "",
//       "hab_B_2": "",
//       "hab_B_3": ""
//     }
//   ];
//
//   if ($scope.character && $scope.character.habilites) {
//     $scope.character.habilites.forEach(function (value) {
//       var option_0 = $scope.getSheetOutput(value.options[0]);
//       var option_1 = $scope.getSheetOutput(value.options[1]);
//       var option_2 = $scope.getSheetOutput(value.options[2]);
//       var find = false;
//       // validate if exist
//       for (var i = 0; i < i_discipline; i++) {
//
//         if (dct_model[i].discipline == value.discipline) {
//           // check if repeating ability
//           if (!dct_model[i].hab_A) {
//             // fill free space
//             dct_model[i].hab_A = value.habilite;
//             dct_model[i].hab_A_1 = option_0;
//             dct_model[i].hab_A_2 = option_1;
//             dct_model[i].hab_A_3 = option_2;
//
//             find = true;
//             break;
//           } else if (!dct_model[i].hab_B) {
//             // fill free space
//             dct_model[i].hab_B = value.habilite;
//             dct_model[i].hab_B_1 = option_0;
//             dct_model[i].hab_B_2 = option_1;
//             dct_model[i].hab_B_3 = option_2;
//
//             find = true;
//             break;
//           }
//           // no free space, discipline will be recreate in !find section
//         }
//       }
//       if (!find) {
//         // not exist
//         // TODO add validation here
//         dct_model[i_discipline].discipline = value.discipline;
//         dct_model[i_discipline].hab_A = value.habilite;
//         dct_model[i_discipline].hab_A_1 = option_0;
//         dct_model[i_discipline].hab_A_2 = option_1;
//         dct_model[i_discipline].hab_A_3 = option_2;
//
//         i_discipline++;
//       }
//     });
//   }
//
//   $scope.cs_character_habilites = dct_model;
// };

//get the string to output on the character sheet
  $scope.getSheetOutput = function (value) {
    return isDefined(value) ? value.toString() : "";
  };

//fills the checks array with booleans used as models to determine whether checkboxes are checked or not
  $scope.setChecks = function () {

    $scope.cs_checks = [];

    [1, 2, 3].foreach(function (value) {
      $scope.cs_checks.push(cs_character.endurance.length >= value);
      $scope.cs_checks.push(cs_character.energie.length >= value);
    });
  };

  $scope.newPlayer = function () {
    // create empty player with empty character
    $scope.last_player = $scope.player = {};
    $scope.last_character = $scope.character = {};
    $scope.player.character = [$scope.character];

    $scope.setCharacterData(null);
    $scope.new_player = true;
    $scope.no_character = false;
  };

  $scope.newCharacter = function () {
    // create empty player with empty character
    $scope.last_character = $scope.character = {};
    $scope.character.name = "New";
    $scope.player.character.push($scope.character);
    $scope.new_character = true;
    // $scope.player.character. = [$scope.character];
  };

  $scope.deleteCharacter = function () {
    var data = Object();
    // TODO: use user id from user creation management to permission
    // data.user_id = $scope.player.id;
    data.player = $scope.player;
    data.delete_character_id = $scope.character.id;
    // TODO: need to get id if new character or player to update ddb_user
    $http({
      method: "post",
      url: "/cmd/character_view",
      headers: {"Content-Type": "application/json; charset=UTF-8"},
      data: data,
      timeout: 5000
    });
    $scope.player.character.remove($scope.player.character.indexOf($scope.character));
    $scope.character = null;
    // reselect new character if exist
    $scope.setCharacterData(null);
  };

  $scope.deletePlayer = function () {
    var data = Object();
    // TODO: use user id from user creation management to permission
    // data.user_id = $scope.player.id;
    data.delete_player_id = $scope.player.id;
    // TODO: need to get id if new character or player to update ddb_user
    $http({
      method: "post",
      url: "/cmd/character_view",
      headers: {"Content-Type": "application/json; charset=UTF-8"},
      data: data,
      timeout: 5000
    });
    $scope.ddb_user.remove($scope.ddb_user.indexOf($scope.player));
    $scope.player = null;
    $scope.character = null;
  };

  $scope.discardPlayer = function () {
    $scope.new_player = false;
    $scope.player = $scope.last_player;
    // $scope.setCharacterData(null);
  };

  $scope.discardCharacter = function () {
    $scope.new_character = false;
    $scope.character = $scope.last_character;
    // $scope.setCharacterData($scope.character);
  };

  $scope.setCharacterData = function (value) {
    if (!$scope.player) {
      // no player is selected
      $scope.last_character = $scope.character = null;
    } else if (value === null) {
      // if null, select first character
      if (isDefined($scope.player.character) && $scope.player.character.length) {
        $scope.character = $scope.player.character[0];
      } else {
        // no character on this player
        $scope.last_character = $scope.character = null;
      }
    } else {
      $scope.character = value;
    }
  };

  $scope.printCharacterSheet = function () {
    var elem = document.getElementById("characterSheet");
    var domClone = elem.cloneNode(true);

    var printSection = document.getElementById("printSection");

    if (!printSection) {
      printSection = document.createElement("div");
      printSection.id = "printSection";
      document.body.appendChild(printSection);
    }

    printSection.innerHTML = "<h1>Feuille de personnage</h1>";
    printSection.appendChild(domClone);

    window.print();
  };

  $scope.countTotalXp = function () {
    if ($scope.character === null || $scope.model_char === null) {
      return 0;
    }
    var total_xp = $scope.model_char.xp_naissance + $scope.model_char.xp_autre;
    if (isDefined($scope.model_char.xp_gn_1_2016)) {
      total_xp += $scope.model_char.xp_gn_1_2016;
    }
    if (isDefined($scope.model_char.xp_gn_2_2016)) {
      total_xp += $scope.model_char.xp_gn_2_2016;
    }
    if (isDefined($scope.model_char.xp_gn_3_2016)) {
      total_xp += $scope.model_char.xp_gn_3_2016;
    }
    if (isDefined($scope.model_char.xp_gn_4_2016)) {
      total_xp += $scope.model_char.xp_gn_4_2016;
    }
    if (isDefined($scope.model_char.xp_donjon_1_2017)) {
      total_xp += $scope.model_char.xp_donjon_1_2017;
    }
    if (isDefined($scope.model_char.xp_gn_1_2017)) {
      total_xp += $scope.model_char.xp_gn_1_2017;
    }
    if (isDefined($scope.model_char.xp_gn_2_2017)) {
      total_xp += $scope.model_char.xp_gn_2_2017;
    }
    if (isDefined($scope.model_char.xp_gn_3_2017)) {
      total_xp += $scope.model_char.xp_gn_3_2017;
    }
    if (isDefined($scope.model_char.xp_gn_4_2017)) {
      total_xp += $scope.model_char.xp_gn_4_2017;
    }
    return total_xp;
  };

  $scope.countTotalCostXp = function () {
    if ($scope.character === null || $scope.model_char === null) {
      return 0;
    }
    var total_xp = 0;
    if (isDefined($scope.model_char.energie)) {
      total_xp += $scope.model_char.energie.length;
    }
    if (isDefined($scope.model_char.endurance)) {
      total_xp += $scope.model_char.endurance.length;
    }
    if (isDefined($scope.model_char.habilites)) {
      for (var i = 0; i < $scope.model_char.habilites.length; i++) {
        var obj = $scope.model_char.habilites[i];
        if (isDefined(obj.options)) {
          total_xp += obj.options.length;
        }
      }
    }
    if (isDefined($scope.model_char.technique_maitre)) {
      for (var i = 0; i < $scope.model_char.technique_maitre.length; i++) {
        var obj = $scope.model_char.technique_maitre[i];
        if (isDefined(obj.options)) {
          total_xp += obj.options.length;
        }
      }
    }
    return total_xp;
  };

  $scope.diffTotalXp = function () {
    return $scope.countTotalXp() - $scope.countTotalCostXp()
  };

  $scope.showDiffTotalXp = function () {
    var diff = $scope.diffTotalXp();
    if (diff > 0) {
      return "+" + diff;
    }
    return diff;
  };

  $scope.get_html_qr_code = function () {
    var typeNumber = 5;
    var errorCorrectionLevel = 'L';
    var qr = qrcode(typeNumber, errorCorrectionLevel);
    var data = $window.location.origin + "/character#/?id_player=" + $scope.player.id
    $scope.url_qr_code = data;
    qr.addData(data);
    qr.make();
    $scope.html_qr_code = qr.createImgTag();
  };

// socket.onmessage = function (e) {
//   $scope.message = JSON.parse(e.data);
//   console.log($scope.message);
//   $scope.$apply();
// };

// For admin page
//  $http.get("/cmd/character_view").success(
//    function (response/*, status, headers, config*/) {
//      $scope.ddb_user = response.data;
//    }
//  );

  $scope.is_main = $window.location.hash.substring($window.location.hash.length - 4) == "#!/";
  if ($scope.is_main) {
    $scope.player_id_from_get = "";
  } else {
    // Get id_player, it's suppose to be the last 32 bytes
    $scope.player_id_from_get = $window.location.hash.substr(-32);
    // When no id_player, it's because == #!/
    if ($scope.player_id_from_get == "#!/") {
      $scope.player_id_from_get = "";
    } else {
      $scope.no_character = true;
    }
  }

  if ($scope.is_admin) {
    $scope.url_view_character = "/cmd/character_view?is_admin";
  } else {
    $scope.url_view_character = "/cmd/character_view";
  }
  $http({
    method: "get",
    url: $scope.url_view_character,
    headers: {"Content-Type": "application/json; charset=UTF-8"},
    // data: $httpParamSerializerJQLike(data),
    timeout: 5000
  }).then(function (response/*, status, headers, config*/) {
    $scope.ddb_user = response.data;
    console.log(response.data);
    var data = response.data;
    // special effect, if only one character, select first one
    if (data.length >= 1 && !$scope.is_admin) {
      $scope.player = data[0];
      $scope.character = data[0].character[0];
      $scope.setCharacterData(data[0]);
      $scope.player = data[0];
      $scope.setCharacterData($scope.character);

      $scope.$apply();
    }
  });
}]);
